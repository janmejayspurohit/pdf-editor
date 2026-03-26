import { ReactNode } from 'react';

interface PrivateContentProps {
  children: ReactNode;
}

export function PrivateContent({ children }: PrivateContentProps) {
  return <>{children}</>;
}
