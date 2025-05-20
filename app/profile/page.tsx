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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </motion.div>
    </main>
  );
}