"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart, Download, Calendar, Clock, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/use-toast";

export default function UsagePage() {
  const [usageStats] = useState({
    totalCredits: 1000,
    usedCredits: 450,
    remainingCredits: 550,
    lastReset: "Apr 1, 2024",
    nextReset: "May 1, 2024"
  });

  const [usageHistory] = useState([
    {
      id: 1,
      date: "Apr 15, 2024",
      description: "Voice generation - 2 minutes",
      credits: 16,
      type: "voice"
    },
    {
      id: 2,
      date: "Apr 14, 2024",
      description: "Voice generation - 1.5 minutes",
      credits: 12,
      type: "voice"
    },
    {
      id: 3,
      date: "Apr 13, 2024",
      description: "Voice generation - 3 minutes",
      credits: 24,
      type: "voice"
    }
  ]);

  return (
    <main className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-6">
          {/* Usage Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>
                Track your credit usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total Credits</span>
                    </div>
                    <span className="text-2xl font-bold">{usageStats.totalCredits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Used Credits</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{usageStats.usedCredits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Remaining Credits</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{usageStats.remainingCredits}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Last Reset</span>
                    </div>
                    <span className="text-sm">{usageStats.lastReset}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Next Reset</span>
                    </div>
                    <span className="text-sm">{usageStats.nextReset}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Recent credit usage activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                {usageHistory.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{item.description}</h3>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {item.credits} credits
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Download Receipt",
                              description: "Receipt download started",
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {index < usageHistory.length - 1 && <Separator className="mt-4" />}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Credit Usage Guide Card */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Usage Guide</CardTitle>
              <CardDescription>
                Understanding how credits are used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Voice Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Credits are used based on the duration of generated audio:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>2 credits per 15 seconds of audio</li>
                    <li>Credits are rounded up to the nearest 15-second interval</li>
                    <li>Minimum charge of 2 credits per generation</li>
                  </ul>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Billing Cycle</h3>
                  <p className="text-sm text-muted-foreground">
                    Your credits reset on the first day of each month. Unused credits do not roll over to the next month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  );
} 