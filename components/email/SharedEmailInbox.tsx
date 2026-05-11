"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ForwardEmail } from "@prisma/client";
import useSWR from "swr";

import { cn, fetcher, htmlToText } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import { TimeAgoIntl } from "../shared/time-ago";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import EmailDetail from "./EmailDetail";
import Loader from "./Loader";

interface SharedInboxResponse {
  emailAddress: string;
  total: number;
  list: ForwardEmail[];
  share: {
    id: string;
    token: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export default function SharedEmailInbox({ token }: { token: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<SharedInboxResponse>(
    `/api/email/share/${token}?page=${currentPage}&size=${pageSize}`,
    fetcher,
    {
      dedupingInterval: 2000,
    },
  );

  useEffect(() => {
    if (!selectedEmailId) return;

    const emailExists = data?.list.some(
      (email) => email.id === selectedEmailId,
    );
    if (!emailExists) {
      setSelectedEmailId(null);
    }
  }, [data, selectedEmailId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  if (error) {
    return (
      <div className="grids mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-8 text-center">
        <Icons.notFonudLink className="size-20" />
        <h1 className="my-3 text-2xl font-bold">Share link unavailable</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This email share link is invalid, revoked, or the mailbox no longer
          exists.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col p-3 md:p-6">
      <div className="mb-3 rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.link className="size-4" />
              <span>Read-only shared inbox</span>
            </div>
            <h1 className="mt-1 break-all text-xl font-semibold md:text-2xl">
              {data?.emailAddress || "Shared email inbox"}
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
          >
            <Icons.refreshCw
              className={cn(
                "mr-2 size-4",
                isRefreshing || isLoading ? "animate-spin" : "",
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        {isLoading && (
          <div className="flex flex-col gap-2 p-2">
            {[...Array(8)].map((_, index) => (
              <Skeleton key={index} className="h-[82px] w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && data && (
          <>
            <div className="flex items-center gap-2 border-b bg-neutral-100/60 p-3 text-sm font-semibold text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              <Icons.inbox className="size-4" />
              <span>Inbox</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {data.total} emails
              </span>
            </div>

            <div className="scrollbar-hidden flex-1 overflow-y-auto">
              {selectedEmailId ? (
                <EmailDetail
                  email={data.list.find(
                    (email) => email.id === selectedEmailId,
                  )}
                  selectedEmailId={selectedEmailId}
                  onClose={() => setSelectedEmailId(null)}
                  onMarkAsRead={() => {}}
                />
              ) : data.total > 0 ? (
                data.list.map((email) => (
                  <div
                    key={email.id}
                    className="border-b border-dotted bg-neutral-50/70 px-3 py-2 hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-900 hover:dark:bg-neutral-800"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => setSelectedEmailId(email.id)}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="w-3/4 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {email.fromName || email.subject || "Untitled"}
                        </span>
                        <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-400">
                          <TimeAgoIntl
                            date={(email.date as any) || email.createdAt}
                          />
                        </span>
                      </div>
                      <div className="mb-0.5 line-clamp-1 w-3/4 truncate text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {email.subject}
                      </div>
                      <div className="line-clamp-2 break-all text-xs text-neutral-500">
                        {email.html
                          ? htmlToText(email.html)
                          : email.text || "No content"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6">
                  <Loader />
                  <p className="font-mono font-semibold text-neutral-500">
                    Waiting for emails...
                  </p>
                </div>
              )}
            </div>

            {Math.ceil(data.total / pageSize) > 1 && (
              <PaginationWrapper
                className="mx-2 my-1"
                total={data.total}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
