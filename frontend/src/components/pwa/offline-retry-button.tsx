"use client";

import { Button, RefreshIcon } from "@/components/ui";

export function OfflineRetryButton() {
  return (
    <Button
      variant="primary"
      size="lg"
      leftIcon={<RefreshIcon size={18} />}
      onClick={() => window.location.reload()}
    >
      Thử tải lại
    </Button>
  );
}
