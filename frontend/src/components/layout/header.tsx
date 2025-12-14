"use client";

import { GraduationCap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onStartOver: () => void;
  showStartOver: boolean;
}

export function Header({ onStartOver, showStartOver }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ScholarKey AI</h1>
            <p className="text-xs text-gray-500">
              Your Pathway to Global Education
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showStartOver && (
            <Button variant="outline" onClick={onStartOver} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Hedera Verified</span>
          </div>
        </div>
      </div>
    </header>
  );
}
