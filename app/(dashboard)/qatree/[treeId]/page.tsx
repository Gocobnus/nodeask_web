
import { use } from 'react';
import FlowView from './FlowView';

// The interface for props coming from Next.js for a Server Component page
interface QATreePageProps {
  params: Promise<{ treeId: string; }>;
}

// This is a Server Component again
export default function QATreePage({ params: paramsPromise }: QATreePageProps) {
  // Use the new React.use() hook to unwrap the promise, as recommended by the warning.
  const { treeId } = use(paramsPromise);

  // The Server Component's only job is to get the ID and pass it to the Client Component.
  // All complex logic will now be in FlowView.
  return <FlowView treeId={treeId} />;
}
