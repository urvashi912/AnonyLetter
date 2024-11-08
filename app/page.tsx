"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card as CardComponent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenLine, Send, Users } from "lucide-react";

interface Letter {
  id: string;
  content: string;
  senderName: string;
  recipientName: string;
}

export default function Home() {
  const [name, setName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [letter, setLetter] = useState("");
  const [receivedLetters, setReceivedLetters] = useState<Letter[]>([]);
  const [sentLetters, setSentLetters] = useState<Letter[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isJoined && !ws) {
      const connectWebSocket = () => {
        const websocket = new WebSocket("ws://localhost:3001/ws");
        
        websocket.onopen = () => {
          console.log("WebSocket connected");
          websocket.send(JSON.stringify({ type: "join", name }));
        };

        websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        websocket.onclose = () => {
          console.log("WebSocket closed. Reconnecting...");
          setWs(null);
          timeoutId = setTimeout(connectWebSocket, 3000);
        };

        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "online_count":
              setOnlineCount(data.count);
              break;
            case "receive_letter":
              setReceivedLetters(prev => [data.letter, ...prev]);
              toast(`New Letter Received! From: ${data.letter.senderName}`);
              break;
            case "letter_sent":
              setSentLetters(prev => [data.letter, ...prev]);
              toast(`Letter Sent Successfully! To: ${data.letter.recipientName}`);
              break;
            case "error":
              toast(data.message);
              break;
          }
        };

        setWs(websocket);

        return () => {
          websocket.close();
        };
      };

      connectWebSocket();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [isJoined, name, toast, ws]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsJoined(true);
    }
  };

  const handleSendLetter = () => {
    if (letter.trim() && ws) {
      ws.send(JSON.stringify({
        type: "letter",
        content: letter,
      }));
      setLetter("");
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <CardComponent className="p-8">
            <div className="text-center mb-8">
              <PenLine className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-2">Anony Letters</h1>
              <p className="text-muted-foreground">
                Connect with strangers through anonymous letters. Share your thoughts, stories, or just say hello!
              </p>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                required
              />
              <Button type="submit" className="w-full">
                Start Writing
              </Button>
            </form>
          </CardComponent>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{onlineCount} online</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardComponent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Write a Letter</h2>
              <div className="space-y-4">
                <Textarea
                  placeholder="Write your anonymous letter here..."
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  className="min-h-[200px]"
                />
                <Button
                  onClick={handleSendLetter}
                  disabled={!letter.trim()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Random Person
                </Button>
              </div>
            </CardComponent>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardComponent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Letters</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("received")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Received ({receivedLetters.length})
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("sent")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Sent ({sentLetters.length})
                </Button>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <div id="received" className="space-y-4 mb-8">
                  <h3 className="font-medium text-muted-foreground">Received Letters</h3>
                  {receivedLetters.map((letter) => (
                    <CardComponent key={letter.id} className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        From: {letter.senderName}
                      </p>
                      <p className="whitespace-pre-wrap">{letter.content}</p>
                    </CardComponent>
                  ))}
                </div>
                <div id="sent" className="space-y-4">
                  <h3 className="font-medium text-muted-foreground">Sent Letters</h3>
                  {sentLetters.map((letter) => (
                    <CardComponent key={letter.id} className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        To: {letter.recipientName}
                      </p>
                      <p className="whitespace-pre-wrap">{letter.content}</p>
                    </CardComponent>
                  ))}
                </div>
              </ScrollArea>
            </CardComponent>
          </motion.div>
        </div>
      </div>
    </div>
  );
}