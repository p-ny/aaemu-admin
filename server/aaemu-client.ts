import axios, { type AxiosInstance } from "axios";

export class AAEmuClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(ip: string, port: number) {
    this.baseUrl = `http://${ip}:${port}`;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getStatus() {
    try {
      const response = await this.client.get("/status");
      const raw = String(response.data);
      const uptimeMatch = raw.match(/Server uptime:\s*([^<\n]+)/i);
      const playersMatch = raw.match(/Players online:\s*(\d+)/i);
      const uptime = uptimeMatch ? uptimeMatch[1].trim() : undefined;
      const players = playersMatch ? parseInt(playersMatch[1]) : 0;
      const message = [
        uptime ? `Uptime: ${uptime}` : null,
        playersMatch ? `Players: ${playersMatch[1]}` : null,
      ].filter(Boolean).join(" | ") || "Connected";
      return { success: true, online: true, message, raw, uptime, players };
    } catch (e: any) {
      if (e.code === "ECONNREFUSED") {
        return { success: false, online: false, message: "Connection refused" };
      }
      if (e.code === "EAI_AGAIN" || e.code === "ENOTFOUND") {
        return { success: false, online: false, message: `Cannot resolve hostname - try using an IP address instead` };
      }
      if (e.code === "ETIMEDOUT" || e.code === "ECONNABORTED") {
        return { success: false, online: false, message: "Connection timed out" };
      }
      return { success: false, online: false, message: e.message };
    }
  }

  async getLoggedCharacters() {
    const response = await this.client.get("/api/world/logged-characters");
    return response.data;
  }

  async getCharacterList(params?: { AccountId?: string; Name?: string }) {
    const queryString = params
      ? "?" + Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
      : "";
    const response = await this.client.get(`/api/character/list${queryString}`);
    return response.data;
  }

  async executeCommand(commandName: string, character: string, commandArguments: string) {
    const response = await this.client.post(`/api/commands/${commandName}`, {
      character,
      arguments: commandArguments,
    });
    return response.data;
  }

  async getExpeditions() {
    const response = await this.client.get("/api/expedition/list");
    return response.data;
  }

  async getAuctionList() {
    const response = await this.client.get("/api/auction/list");
    return response.data;
  }

  async searchAuction(params: Record<string, string>) {
    const queryString = Object.entries(params)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    const response = await this.client.get(`/api/auction/search?${queryString}`);
    return response.data;
  }

  async addAuctionItem(data: {
    ItemId: number;
    Quantity: number;
    Price: number;
    Duration: number;
    ClientId: number;
    ClientName: string;
  }) {
    const response = await this.client.post("/api/auction/add", data);
    return response.data;
  }

  async generateAuctionItem(data: {
    ItemTemplateId: number;
    Quantity: number;
    GradeId: number;
    BuyNowPrice: number;
    StartPrice: number;
    Duration: number;
    ClientId: number;
    ClientName: string;
  }) {
    const response = await this.client.post("/api/auction/generate", data);
    return response.data;
  }

  async sendMail(data: {
    SenderName?: string;
    Title: string;
    Body: string;
    Recipients: number[];
    RecipientType: number;
    Type?: number;
    Money?: number;
    Billing?: number;
    AttachmentItems?: { Id: number; Count: number }[];
  }) {
    const response = await this.client.post("/api/mail/send", data);
    return response.data;
  }

  async listMail(characterId: number) {
    try {
      const response = await this.client.post("/api/mail/list", {
        CharacterId: characterId,
      });
      return response.data;
    } catch (postError: any) {
      if (postError.response?.status === 404 || postError.response?.status === 405) {
        const response = await this.client.get(`/api/mail/list/${characterId}`);
        return response.data;
      }
      throw postError;
    }
  }

  async deleteMail(mailId: number, senderId: number, receiverId: number, trashItems: boolean = false) {
    const response = await this.client.post("/api/mail/delete", {
      MailId: mailId,
      SenderId: senderId,
      ReceiverId: receiverId,
      TrashItems: trashItems,
    });
    return response.data;
  }
}
