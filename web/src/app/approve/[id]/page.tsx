import ApprovalView from '@/components/countersign/ApprovalView';
export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return <main className="p-12">Invalid approval ID.</main>;
  return <ApprovalView id={id} />;
}
