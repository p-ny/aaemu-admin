import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSelectedServer } from "@/hooks/use-aaemu";
import { Mail, Send, Plus, Trash2, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MailItem {
  id: number;
  senderName: string;
  title: string;
  type: number;
  receivedDate: string;
  attachments: number;
  copperCoins: number;
}

function normalizeMailItem(m: any): MailItem {
  return {
    id: m.id ?? m.Id ?? m.mailId ?? m.MailId ?? 0,
    senderName: m.senderName ?? m.SenderName ?? m.sender_name ?? "Unknown",
    title: m.title ?? m.Title ?? m.subject ?? m.Subject ?? "",
    type: m.type ?? m.Type ?? m.mailType ?? m.MailType ?? 0,
    receivedDate: m.receivedDate ?? m.ReceivedDate ?? m.received_date ?? m.openDate ?? m.OpenDate ?? m.Created ?? m.created ?? "",
    attachments: m.attachments ?? m.Attachments ?? m.attachmentCount ?? m.AttachmentCount ?? 0,
    copperCoins: m.copperCoins ?? m.CopperCoins ?? m.copper_coins ?? m.moneyAmount1 ?? m.MoneyAmount1 ?? 0,
  };
}

interface AttachmentItem {
  templateId: string;
  count: string;
}

export default function MailPage() {
  const { serverId } = useSelectedServer();
  const [characterId, setCharacterId] = useState("");
  const [mailItems, setMailItems] = useState<MailItem[]>([]);

  const [senderName, setSenderName] = useState("GM");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState("Character");
  const [recipients, setRecipients] = useState("");
  const [money, setMoney] = useState("");
  const [billing, setBilling] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const loadMail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/aaemu/mail/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, characterId: parseInt(characterId) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load mail");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("[mail/list] Response data:", JSON.stringify(data).substring(0, 1000));
      const items = Array.isArray(data) 
        ? data 
        : data.mails ?? data.Mails ?? data.mailItems ?? data.MailItems ?? data.result ?? data.Result ?? data.records ?? data.Records ?? [];
      const normalized = (Array.isArray(items) ? items : []).map(normalizeMailItem);
      setMailItems(normalized);
    },
  });

  const sendMail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/aaemu/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          senderName,
          title,
          body,
          recipientType,
          recipients: recipients.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)),
          money: parseInt(money) || 0,
          billing: parseInt(billing) || 0,
          attachmentItems: attachments
            .filter((a) => a.templateId)
            .map((a) => ({
              id: parseInt(a.templateId),
              count: parseInt(a.count) || 1,
            })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send mail");
      }
      return await res.json();
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setRecipients("");
      setMoney("");
      setBilling("");
      setAttachments([]);
    },
  });

  const addAttachment = () => {
    setAttachments([...attachments, { templateId: "", count: "1" }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const updateAttachment = (index: number, field: keyof AttachmentItem, value: string) => {
    const updated = [...attachments];
    updated[index] = { ...updated[index], [field]: value };
    setAttachments(updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Mail Management</h2>
        <p className="text-muted-foreground mt-1">View and send in-game mail.</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <h3 className="text-lg font-bold font-display text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Look Up Mail
        </h3>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="characterId">Character ID</Label>
            <Input
              id="characterId"
              type="number"
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              placeholder="Enter Character ID"
              className="bg-black/20 border-white/10"
            />
          </div>
          <Button
            onClick={() => loadMail.mutate()}
            disabled={!characterId || !serverId || loadMail.isPending}
            className="gap-2"
          >
            {loadMail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Load Mail
          </Button>
        </div>

        {loadMail.isError && (
          <p className="text-red-400 text-sm mt-2">{loadMail.error.message}</p>
        )}

        {mailItems.length > 0 && (
          <div className="mt-6 rounded-lg border border-white/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Sender</TableHead>
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Attachments</TableHead>
                  <TableHead className="text-muted-foreground">Copper</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mailItems.map((mail) => (
                  <TableRow key={mail.id} className="border-white/5">
                    <TableCell className="font-mono text-sm">{mail.id}</TableCell>
                    <TableCell>{mail.senderName}</TableCell>
                    <TableCell>{mail.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10">{mail.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{mail.receivedDate}</TableCell>
                    <TableCell className="font-mono">{mail.attachments}</TableCell>
                    <TableCell className="font-mono">{mail.copperCoins}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {mailItems.length === 0 && loadMail.isSuccess && (
          <p className="text-muted-foreground text-sm mt-4 text-center py-4">No mail found for this character.</p>
        )}
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <h3 className="text-lg font-bold font-display text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Send Mail
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mailTitle">Title</Label>
              <Input
                id="mailTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mail subject"
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailBody">Body</Label>
            <Textarea
              id="mailBody"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Mail body content..."
              rows={4}
              className="bg-black/20 border-white/10 resize-none"
            />
          </div>

          <Separator className="bg-white/5" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Character">Character</SelectItem>
                  <SelectItem value="Expedition">Expedition</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated IDs)</Label>
              <Input
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="e.g. 1001, 1002, 1003"
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="money">Money Amount</Label>
              <Input
                id="money"
                type="number"
                value={money}
                onChange={(e) => setMoney(e.target.value)}
                placeholder="0"
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing">Billing Amount</Label>
              <Input
                id="billing"
                type="number"
                value={billing}
                onChange={(e) => setBilling(e.target.value)}
                placeholder="0"
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>

          <Separator className="bg-white/5" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base">Attachment Items</Label>
              <Button variant="outline" size="sm" onClick={addAttachment} className="gap-2 border-white/10 hover:bg-white/5">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>
            {attachments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-3 border border-dashed border-white/10 rounded-lg">
                No attachments. Click "Add Item" to attach items.
              </p>
            )}
            <div className="space-y-2">
              {attachments.map((att, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={att.templateId}
                    onChange={(e) => updateAttachment(index, "templateId", e.target.value)}
                    placeholder="Item Template ID"
                    className="bg-black/20 border-white/10 flex-1"
                  />
                  <Input
                    type="number"
                    value={att.count}
                    onChange={(e) => updateAttachment(index, "count", e.target.value)}
                    placeholder="Count"
                    className="bg-black/20 border-white/10 w-28"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(index)}
                    className="text-muted-foreground hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={() => sendMail.mutate()}
            disabled={!serverId || !title || sendMail.isPending}
            className="w-full gap-2"
          >
            {sendMail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Mail
          </Button>

          {sendMail.isError && (
            <p className="text-red-400 text-sm">{sendMail.error.message}</p>
          )}
          {sendMail.isSuccess && (
            <p className="text-green-400 text-sm">Mail sent successfully!</p>
          )}
        </div>
      </Card>
    </div>
  );
}