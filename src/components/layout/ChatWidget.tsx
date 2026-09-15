import { useShop } from "@/context/app-context";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

export function ChatWidget() {
  const { chatEnabled, chatGreeting, whatsappNumber, storeName } = useShop();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (!chatEnabled) return null;
  const whatsapp = whatsappNumber.replace(/[^0-9]/g, "");
  const sendMessage = () => {
    if (!message.trim()) return;
    setSent(true);
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message.trim())}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed right-4 bottom-20 z-40 sm:right-6 sm:bottom-6">
      {open && (
        <div className="glass-strong mb-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/50 p-4">
            <div>
              <p className="font-display text-sm font-semibold">{storeName} care</p>
              <p className="text-[11px] text-muted-foreground">Usually replies quickly</p>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-accent">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <p className="rounded-2xl bg-muted/70 px-3 py-2 text-xs leading-5">{chatGreeting}</p>
            {sent && <p className="rounded-2xl bg-primary/10 px-3 py-2 text-xs leading-5">Thanks. Opening WhatsApp for our care team.</p>}
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." rows={3} className="w-full resize-none rounded-2xl border border-border/60 bg-background/60 p-3 text-xs outline-none focus:border-primary" />
            <button type="button" onClick={sendMessage} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90">
              <Send className="size-3.5" /> Send to WhatsApp
            </button>
          </div>
        </div>
      )}
      <button type="button" aria-label="Open live chat" onClick={() => setOpen((value) => !value)} className="ml-auto grid size-14 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105">
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
