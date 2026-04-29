import { Button } from "@/components/ui/button";
import { Target, Zap, Users } from "lucide-react";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-hero)" }} />
          <span className="font-semibold text-lg">Linea Outreach</span>
        </div>
        <Button variant="outline">Sign in</Button>
      </header>

      <section className="container py-20 text-center">
        <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground mb-6">
          B2B Prospection, reimagined
        </span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Help Linea reach the right customers, faster.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Find, qualify and engage high-intent B2B leads with a tool built for modern sales teams.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" className="shadow-[var(--shadow-elegant)]">Get started</Button>
          <Button size="lg" variant="ghost">Learn more</Button>
        </div>
      </section>

      <section className="container grid md:grid-cols-3 gap-6 pb-24">
        {[
          { icon: Target, title: "Targeted prospecting", desc: "Surface the accounts most likely to convert." },
          { icon: Zap, title: "Automated outreach", desc: "Personalized sequences that scale with your team." },
          { icon: Users, title: "Pipeline insights", desc: "Track engagement and double down on what works." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <Icon className="h-6 w-6 text-primary mb-4" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Index;
