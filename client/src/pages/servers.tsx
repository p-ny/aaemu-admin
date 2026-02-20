import { useState } from "react";
import {
  useServers,
  useAddServer,
  useUpdateServer,
  useDeleteServer,
  useTestServer,
  useTestMysql,
} from "@/hooks/use-aaemu";
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wifi,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ServerForm {
  name: string;
  ip: string;
  port: number;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
}

const emptyForm: ServerForm = {
  name: "",
  ip: "127.0.0.1",
  port: 1280,
  mysqlHost: "127.0.0.1",
  mysqlPort: 3306,
  mysqlUser: "",
  mysqlPassword: "",
  mysqlDatabase: "",
};

function ServerFormFields({
  form,
  setForm,
}: {
  form: ServerForm;
  setForm: (f: ServerForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Server Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Production Server"
          className="bg-black/20 border-white/10"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>IP Address</Label>
          <Input
            value={form.ip}
            onChange={(e) => setForm({ ...form, ip: e.target.value })}
            placeholder="127.0.0.1"
            className="bg-black/20 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label>Port</Label>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
            className="bg-black/20 border-white/10"
          />
        </div>
      </div>
      <div className="pt-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">MySQL Configuration</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>MySQL Host</Label>
          <Input
            value={form.mysqlHost}
            onChange={(e) => setForm({ ...form, mysqlHost: e.target.value })}
            placeholder="127.0.0.1"
            className="bg-black/20 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label>MySQL Port</Label>
          <Input
            type="number"
            value={form.mysqlPort}
            onChange={(e) => setForm({ ...form, mysqlPort: parseInt(e.target.value) || 0 })}
            className="bg-black/20 border-white/10"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>MySQL User</Label>
          <Input
            value={form.mysqlUser}
            onChange={(e) => setForm({ ...form, mysqlUser: e.target.value })}
            placeholder="root"
            className="bg-black/20 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label>MySQL Password</Label>
          <Input
            type="password"
            value={form.mysqlPassword}
            onChange={(e) => setForm({ ...form, mysqlPassword: e.target.value })}
            placeholder="••••••••"
            className="bg-black/20 border-white/10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>MySQL Database</Label>
        <Input
          value={form.mysqlDatabase}
          onChange={(e) => setForm({ ...form, mysqlDatabase: e.target.value })}
          placeholder="aaemu_game"
          className="bg-black/20 border-white/10"
        />
      </div>
    </div>
  );
}

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const addServer = useAddServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const testServer = useTestServer();
  const testMysql = useTestMysql();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<ServerForm>({ ...emptyForm });

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ServerForm>({ ...emptyForm });

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [testResults, setTestResults] = useState<Record<number, { webapi?: any; mysql?: any }>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addServer.mutate(addForm, {
      onSuccess: () => {
        setAddOpen(false);
        setAddForm({ ...emptyForm });
      },
    });
  };

  const handleEdit = (server: any) => {
    setEditId(server.id);
    setEditForm({
      name: server.name || "",
      ip: server.ip || "127.0.0.1",
      port: server.port || 1280,
      mysqlHost: server.mysqlHost || "",
      mysqlPort: server.mysqlPort || 3306,
      mysqlUser: server.mysqlUser || "",
      mysqlPassword: server.mysqlPassword || "",
      mysqlDatabase: server.mysqlDatabase || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId === null) return;
    updateServer.mutate(
      { id: editId, data: editForm },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditId(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteServer.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const handleTestWebApi = (id: number) => {
    testServer.mutate(id, {
      onSuccess: (data) => {
        setTestResults((prev) => ({ ...prev, [id]: { ...prev[id], webapi: data } }));
      },
      onError: (err) => {
        setTestResults((prev) => ({
          ...prev,
          [id]: { ...prev[id], webapi: { success: false, message: err.message } },
        }));
      },
    });
  };

  const handleTestMysql = (id: number) => {
    testMysql.mutate(id, {
      onSuccess: (data) => {
        setTestResults((prev) => ({ ...prev, [id]: { ...prev[id], mysql: data } }));
      },
      onError: (err) => {
        setTestResults((prev) => ({
          ...prev,
          [id]: { ...prev[id], mysql: { success: false, message: err.message } },
        }));
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-display text-white">Server Management</h2>
          <p className="text-muted-foreground mt-1">Configure and manage game servers.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Server</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <ServerFormFields form={addForm} setForm={setAddForm} />
              <Button type="submit" className="w-full" disabled={addServer.isPending || !addForm.name}>
                {addServer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Server
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading servers...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers?.map((server) => {
          const result = testResults[server.id];
          const hasMysql = !!(server as any).mysqlHost;
          return (
            <Card key={server.id} className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    {server.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {server.ip}:{server.port}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(server)}
                    className="text-muted-foreground hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {deleteConfirm === server.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(server.id)}
                        disabled={deleteServer.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs"
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                        className="text-muted-foreground text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(server.id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="border-white/10 gap-1">
                  <Database className="w-3 h-3" />
                  {hasMysql ? "MySQL Configured" : "MySQL Not Set"}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestWebApi(server.id)}
                  disabled={testServer.isPending}
                  className="gap-2 border-white/10 hover:bg-white/5"
                >
                  <Wifi className="w-4 h-4" />
                  Test WebAPI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestMysql(server.id)}
                  disabled={testMysql.isPending}
                  className="gap-2 border-white/10 hover:bg-white/5"
                >
                  <Database className="w-4 h-4" />
                  Test MySQL
                </Button>
              </div>

              {result?.webapi && (
                <div className={`mt-3 text-sm flex items-center gap-2 ${result.webapi.success ? "text-green-400" : "text-red-400"}`}>
                  {result.webapi.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  WebAPI: {result.webapi.message || (result.webapi.success ? "Connected" : "Failed")}
                </div>
              )}
              {result?.mysql && (
                <div className={`mt-2 text-sm flex items-center gap-2 ${result.mysql.success ? "text-green-400" : "text-red-400"}`}>
                  {result.mysql.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  MySQL: {result.mysql.message || (result.mysql.success ? "Connected" : "Failed")}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!isLoading && servers?.length === 0 && (
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Servers Configured</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Add a server to get started with administration.
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Your First Server
          </Button>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Server</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <ServerFormFields form={editForm} setForm={setEditForm} />
            <Button type="submit" className="w-full" disabled={updateServer.isPending || !editForm.name}>
              {updateServer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}