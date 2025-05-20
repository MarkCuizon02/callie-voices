"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Copy, AlertTriangle, Webhook, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/use-toast";

export default function ApiSettingsPage() {
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string;
    name: string;
    key: string;
    created: string;
    lastUsed: string;
    status: 'active' | 'revoked';
  }>>([
    { 
      id: "key_1", 
      name: "Development", 
      key: "sk_1234567890abcdef", 
      created: "Apr 1, 2024", 
      lastUsed: "2 hours ago",
      status: "active"
    }
  ]);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState({
    callStarted: false,
    callEnded: true,
    transcriptReady: true,
    recordingReady: true
  });

  const handleGenerateKey = async () => {
    if (!newKeyName) return;
    
    setIsSaving(true);
    try {
      // Simulated key generation
      const newKey = {
        id: `key_${Date.now()}`,
        name: newKeyName,
        key: `sk_${Math.random().toString(36).substring(2)}`,
        created: new Date().toLocaleDateString(),
        lastUsed: "Never",
        status: "active" as const
      };
      
      setApiKeys(prev => [...prev, newKey]);
      setNewKeyName("");
      setShowNewKeyDialog(false);
      toast({
        title: "Success",
        description: "New API key has been generated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate API key.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-6">
          {/* API Keys Card */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border">
                {apiKeys.map((apiKey, index) => (
                  <motion.div
                    key={apiKey.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apiKey.name}</h3>
                        <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                          {apiKey.status === 'active' ? 'Active' : 'Revoked'}
                        </Badge>
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="bg-muted rounded-md px-2 py-1 font-mono text-xs">
                          {apiKey.key.substring(0, 8)}...{apiKey.key.substring(apiKey.key.length - 4)}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey.key);
                            toast({
                              title: "Copied",
                              description: "API key copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p>Created: {apiKey.created}</p>
                      <p className="text-muted-foreground">Last used: {apiKey.lastUsed}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          setApiKeys(prev =>
                            prev.map(key =>
                              key.id === apiKey.id
                                ? { ...key, status: key.status === 'active' ? 'revoked' : 'active' }
                                : key
                            )
                          );
                          toast({
                            title: `API Key ${apiKey.status === 'active' ? 'Revoked' : 'Activated'}`,
                            description: `The API key "${apiKey.name}" has been ${apiKey.status === 'active' ? 'revoked' : 'activated'}.`,
                          });
                        }}
                      >
                        {apiKey.status === 'active' ? 'Revoke' : 'Activate'}
                      </Button>
                    </div>
                    {index < apiKeys.length - 1 && <Separator className="mt-4" />}
                  </motion.div>
                ))}
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-muted-foreground">API keys give full access to your account. Keep them secret!</p>
              </div>
              
              <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span>Generate New API Key</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New API Key</DialogTitle>
                    <DialogDescription>
                      Create a new API key for your application. Make sure to copy your key now - you won't be able to see it again!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Key Name</Label>
                      <Input
                        id="key-name"
                        placeholder="e.g. Production API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleGenerateKey}
                      disabled={!newKeyName || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Key'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Webhooks Card */}
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Set up webhooks to receive real-time events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input 
                  id="webhook-url" 
                  placeholder="https://your-app.com/api/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Events to Send</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="call-started" 
                      checked={webhookEvents.callStarted}
                      onCheckedChange={(checked) => 
                        setWebhookEvents(prev => ({ ...prev, callStarted: checked }))
                      }
                    />
                    <Label htmlFor="call-started">Call Started</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="call-ended" 
                      checked={webhookEvents.callEnded}
                      onCheckedChange={(checked) => 
                        setWebhookEvents(prev => ({ ...prev, callEnded: checked }))
                      }
                    />
                    <Label htmlFor="call-ended">Call Ended</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="transcript-ready" 
                      checked={webhookEvents.transcriptReady}
                      onCheckedChange={(checked) => 
                        setWebhookEvents(prev => ({ ...prev, transcriptReady: checked }))
                      }
                    />
                    <Label htmlFor="transcript-ready">Transcript Ready</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="recording-ready" 
                      checked={webhookEvents.recordingReady}
                      onCheckedChange={(checked) => 
                        setWebhookEvents(prev => ({ ...prev, recordingReady: checked }))
                      }
                    />
                    <Label htmlFor="recording-ready">Recording Ready</Label>
                  </div>
                </div>
              </div>
              
              <Button className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                <span>Save Webhook Settings</span>
              </Button>
            </CardContent>
          </Card>

          {/* API Documentation Card */}
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Learn how to integrate with our API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our API allows you to integrate voice generation capabilities into your applications.
                  Check out our documentation to get started.
                </p>
                <Button variant="outline" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span>View API Documentation</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  );
} 