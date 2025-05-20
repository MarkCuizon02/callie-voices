"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SoundEffectsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-8 px-2">
      <Card className="w-full max-w-2xl shadow-xl border rounded-2xl">
        <CardHeader>
          <CardTitle>Sound Effects</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 items-center justify-center min-h-[200px]">
          <span className="text-muted-foreground text-lg">This feature is coming soon!</span>
        </CardContent>
      </Card>
    </div>
  );
} 