import Ghost from "./Ghost";
export default function WaitlistCTA() {
  return <section className="px-6 py-28 text-center">
    <div className="mx-auto flex justify-center"><Ghost size={120} /></div>
    <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">Trust the receipt.</h2>
    <p className="mx-auto mt-4 max-w-md text-black/60">Deployment and settlement evidence will appear when verified. No payments have been executed by this preview.</p>
    <a href="#network" className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-white">Check the network</a>
  </section>;
}
