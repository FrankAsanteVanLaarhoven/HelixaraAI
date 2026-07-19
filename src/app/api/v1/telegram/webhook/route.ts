import { NextRequest, NextResponse } from "next/server";
import {
  handleTelegramCommand,
  isAllowedTelegramUser,
  telegramHealth,
} from "@/modules/telegram/operator";
import { emitEvent } from "@/modules/events/bus";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await telegramHealth());
}

/**
 * Telegram Bot API webhook payload.
 * Configure: setWebhook to https://your-host/api/v1/telegram/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message?.text || !message.from?.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const fromId = message.from.id;
    const text = String(message.text);

    emitEvent({
      type: "agent.task",
      source: "telegram.webhook",
      severity: "info",
      title: "Telegram message received",
      payload: {
        fromId,
        allowed: isAllowedTelegramUser(fromId),
        preview: text.slice(0, 80),
      },
    });

    const reply = await handleTelegramCommand(fromId, text);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat?.id || fromId,
          text: reply.slice(0, 4000),
        }),
        signal: AbortSignal.timeout(15_000),
      });
    }

    return NextResponse.json({ ok: true, replyPreview: reply.slice(0, 200) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "webhook error" },
      { status: 500 }
    );
  }
}
