"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, Receipt, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/use-toast";

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
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
                    <span>2 credits per 15 seconds of audio</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    <span>Unlimited voice generations</span>
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
              <div className="flex gap-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="destructive">Cancel Subscription</Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
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

          {/* Billing History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past invoices and payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Invoice #1234</p>
                      <p className="text-sm text-muted-foreground">Mar 1, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">$49.00</span>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Invoice #1233</p>
                      <p className="text-sm text-muted-foreground">Feb 1, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">$49.00</span>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
              <CardDescription>
                Monitor your current usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Credits Used</p>
                    <p className="text-sm text-muted-foreground">This billing cycle</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">1,234 / 2,000</p>
                    <p className="text-sm text-muted-foreground">61.7% used</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '61.7%' }}></div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <p>You have 766 credits remaining this month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  );
} 