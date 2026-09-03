"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ForwardEmail } from "@prisma/client";
import { toast } from "sonner";

import { formatDate, htmlToText, isValidEmail } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { Input } from "../ui/input";

import "react-quill/dist/quill.snow.css";

import { useTranslations } from "next-intl";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface SendEmailModalProps {
  className?: string;
  emailAddress: string | null;
  replyToEmail?: ForwardEmail; // 回复模式：被回复的原始邮件
  triggerButton?: React.ReactNode; // 自定义触发按钮
  onSuccess?: () => void; // 发送成功后的回调
}

// 从 Reply-To 之类的字段中提取纯邮箱地址（可能是 `"Name <a@b.c>"`、`a@b.c` 或空引号）
function extractEmailAddress(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/^"+|"+$/g, "").trim();
  const match = cleaned.match(/<([^<>\s]+@[^<>\s]+)>/);
  const address = (match ? match[1] : cleaned).trim();
  return isValidEmail(address) ? address : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReplySubject(subject?: string | null): string {
  const original = subject?.trim() || "No Subject";
  return /^re:/i.test(original) ? original : `Re: ${original}`;
}

// 以纯文本引用原文，避免外部邮件的复杂 HTML 被编辑器破坏
function buildQuotedReplyHtml(email: ForwardEmail): string {
  const sender = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;
  const date = formatDate((email.date || email.createdAt) as any);
  const originalText = (
    email.html ? htmlToText(email.html) : email.text || ""
  ).trim();
  const quotedLines = [
    `On ${date}, ${sender} wrote:`,
    ...originalText.split(/\r?\n/),
  ]
    .map((line) => `<blockquote>${escapeHtml(line) || "<br>"}</blockquote>`)
    .join("");
  return `<p><br></p>${quotedLines}`;
}

export function SendEmailModal({
  className,
  emailAddress,
  replyToEmail,
  triggerButton,
  onSuccess,
}: SendEmailModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", subject: "", html: "" });
  const [isPending, startTransition] = useTransition();

  const t = useTranslations("Email");
  const isReply = Boolean(replyToEmail);

  const handleOpen = () => {
    setSendForm(
      replyToEmail
        ? {
            to: extractEmailAddress(replyToEmail.replyTo) || replyToEmail.from,
            subject: buildReplySubject(replyToEmail.subject),
            html: buildQuotedReplyHtml(replyToEmail),
          }
        : { to: "", subject: "", html: "" },
    );
    setIsOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("No email address selected");
      return;
    }
    if (!sendForm.to || !sendForm.subject || !sendForm.html) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/email/send", {
          method: "POST",
          body: JSON.stringify({
            from: emailAddress,
            to: sendForm.to,
            subject: sendForm.subject,
            html: sendForm.html,
            replyToEmailId: replyToEmail?.id,
          }),
        });

        if (response.ok) {
          toast.success("Email sent successfully");
          setIsOpen(false);
          setSendForm({ to: "", subject: "", html: "" });
          onSuccess?.();
        } else {
          toast.error("Failed to send email", {
            description: await response.text(),
          });
        }
      } catch (error) {
        toast.error(error.message || "Error sending email");
      }
    });
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>{triggerButton}</div>
      ) : (
        <Button
          className={className}
          variant="ghost"
          size="sm"
          onClick={handleOpen}
        >
          <Icons.send size={17} />
        </Button>
      )}

      <Drawer open={isOpen} direction="right" onOpenChange={setIsOpen}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 w-full rounded-none sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-1">
              {isReply ? t("Reply Email") : t("Send Email")}{" "}
              <Icons.help className="size-5 text-neutral-600 hover:text-neutral-400" />
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" className="absolute right-4 top-4">
                <Icons.close className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="scrollbar-hidden h-[calc(100vh)] space-y-4 overflow-y-auto p-6">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("From")}
              </label>
              <Input value={emailAddress || ""} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("To")}
              </label>
              <Input
                value={sendForm.to}
                onChange={(e) =>
                  setSendForm({ ...sendForm, to: e.target.value })
                }
                placeholder="recipient@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("Subject")}
              </label>
              <Input
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm({ ...sendForm, subject: e.target.value })
                }
                placeholder="Enter subject"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("Content")}
              </label>
              <ReactQuill
                value={sendForm.html}
                onChange={(value) => setSendForm({ ...sendForm, html: value })}
                className="mt-1 h-40 rounded-lg"
                theme="snow"
                placeholder="Enter your message"
              />
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isPending}>
                {t("Cancel")}
              </Button>
            </DrawerClose>
            <Button
              onClick={handleSendEmail}
              disabled={isPending}
              variant="default"
            >
              {isPending ? t("Sending") : t("Send")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
