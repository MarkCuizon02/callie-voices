"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Copy, CreditCard, Key, Lock, Loader2, Phone, Settings, Shield, User, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/use-toast";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("account");
  const [name, setName] = useState("Mark Lloyd Cuizon");
  const [email, setEmail] = useState("marklloydcuizon@gmail.com");
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
      key: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "", 
      created: "Apr 1, 2025", 
      lastUsed: "2 hours ago",
      status: "active"
    }
  ]);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    calls: true,
    privacy: false
  });

  // Function to handle avatar upload
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setIsUploading(true);
      // Simulated upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsUploading(false);
    }
  };

  // Function to handle API key generation
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

  // Function to check password strength
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;
    setPasswordStrength(strength);
  };
  
  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-4 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarImage src="" />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              AJ
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{name}</h1>
            <p className="text-muted-foreground">{email}</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-8">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">                    <Label htmlFor="avatar">Profile Picture</Label>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : ""} />
                        <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                          {name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => document.getElementById("avatar")?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Upload New"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Changes</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input 
                        id="new-password" 
                        type="password"
                        onChange={(e) => checkPasswordStrength(e.target.value)}
                      />
                      <div className="flex gap-1 mt-1">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 w-full rounded ${
                              i < passwordStrength
                                ? "bg-primary"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {passwordStrength < 2 && "Weak"}
                        {passwordStrength === 2 && "Medium"}
                        {passwordStrength === 3 && "Strong"}
                        {passwordStrength === 4 && "Very Strong"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Update Password</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="billing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                    Manage your subscription plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Pro Plan</h3>
                        <p className="text-sm text-muted-foreground">$49/month</p>
                      </div>
                      <Badge>Current Plan</Badge>
                    </div>
                    <Separator className="my-4" />
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>Unlimited voice messages</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>500 outbound call minutes per month</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>Advanced voice customization</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>Priority support</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="destructive">Cancel Subscription</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Manage your payment information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-muted h-12 w-16 rounded-md flex items-center justify-center">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">Visa ending in 4242</p>
                          <p className="text-xs text-muted-foreground">Expires 04/2026</p>
                        </div>
                      </div>
                      <Badge variant="outline">Default</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Add Payment Method</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="api">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for external integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">                  <div className="rounded-lg border">
                    {apiKeys.map((apiKey, index) => (
                      <motion.div
                        key={apiKey.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
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
                          <div className="text-right text-sm">
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
                    <Input id="webhook-url" placeholder="https://your-app.com/api/webhook" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Events to Send</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="call-started" />
                        <Label htmlFor="call-started">Call Started</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="call-ended" defaultChecked />
                        <Label htmlFor="call-ended">Call Ended</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="transcript-ready" defaultChecked />
                        <Label htmlFor="transcript-ready">Transcript Ready</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="recording-ready" defaultChecked />
                        <Label htmlFor="recording-ready">Recording Ready</Label>
                      </div>
                    </div>
                  </div>
                  
                  <Button>Save Webhook Settings</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Manage your account preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive email updates about your account</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Call Notifications</p>
                        <p className="text-xs text-muted-foreground">Get notified when calls are completed</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.calls}
                      onCheckedChange={(checked) =>
                        setNotifications(prev => ({ ...prev, calls: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Privacy Mode</p>
                        <p className="text-xs text-muted-foreground">Automatically delete recordings after processing</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.privacy}
                      onCheckedChange={(checked) =>
                        setNotifications(prev => ({ ...prev, privacy: checked }))
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Settings</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>
                    Permanent actions for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-destructive/20 p-4">
                    <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="destructive">Delete My Account</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  );
}