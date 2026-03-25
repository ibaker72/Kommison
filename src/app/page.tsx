import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold tracking-widest bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent mb-8">
        KOMMISON
      </h1>
      <div className="flex flex-col gap-4">
        <Link
          href="/voltgrid"
          className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all uppercase tracking-widest text-center font-bold shadow-[0_0_20px_rgba(0,255,204,0.1)]"
        >
          VoltGrid
        </Link>
      </div>
    </div>
  );
}
