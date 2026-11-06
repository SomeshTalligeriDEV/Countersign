import type { Metadata } from 'next';
import DemoView from '@/components/countersign/DemoView';
export const metadata: Metadata = { title: 'Live demo', description: 'Run the Countersign testnet agent: relayed USDT payments, World ID approvals and on-chain rejections on Whitechain.', alternates: { canonical: '/demo' } };
export default function DemoPage(){return <DemoView/>;}
