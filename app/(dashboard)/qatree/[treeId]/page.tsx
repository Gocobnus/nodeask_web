
import FlowView from './FlowView';

interface QATreePageProps {
  params: Promise<{ treeId: string; }>;
  searchParams: Promise<{ q?: string; }>;
}

export default async function QATreePage({ params, searchParams }: QATreePageProps) {
  const { treeId } = await params;
  const search = await searchParams;
  const initialQuestion = search.q || '';

  return <FlowView treeId={treeId} initialQuestion={initialQuestion} />;
}
