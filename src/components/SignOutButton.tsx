'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      className={className || "btn btn-secondary"}
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
    >
      Sign Out
    </button>
  );
}
