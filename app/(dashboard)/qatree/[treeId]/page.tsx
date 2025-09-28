
import FlowView from './FlowView';

interface QATreePageProps {
  params: {
    treeId: string;
  };
  searchParams: {
    q?: string;
  };
}

export default function QATreePage({ params, searchParams }: QATreePageProps) {
  const { treeId } = params;
  const initialQuestion = searchParams.q || '';

  return <FlowView treeId={treeId} initialQuestion={initialQuestion} />;
}
