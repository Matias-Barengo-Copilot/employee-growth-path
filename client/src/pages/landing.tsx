import { Link } from "wouter";
import copilotLogo from "@assets/copilot_logo_small_1770328812971.png";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Target, 
  Sparkles, 
  MessageSquare, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Team Directory",
    description: "Know your teammates beyond just their job title. Discover skills, interests, and working styles.",
  },
  {
    icon: Target,
    title: "Goals & OKRs",
    description: "Set meaningful goals, track progress, and stay aligned with your team's priorities.",
  },
  {
    icon: Sparkles,
    title: "Recognition Snaps",
    description: "Give quick, heartfelt recognition to teammates. Celebrate wins in under 15 seconds.",
  },
  {
    icon: MessageSquare,
    title: "Peer Feedback",
    description: "Request and provide constructive feedback. Build a culture of continuous growth.",
  },
];

const benefits = [
  "Build stronger team connections",
  "Increase role clarity & accountability",
  "Create healthy feedback loops",
  "Track professional growth",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={copilotLogo} alt="Copilot" className="h-9 w-9" />
            <span className="font-semibold text-lg">Copilot</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Employee Experience Platform
              </div>
              
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                AI that works for
                <span className="border-b-4 border-primary"> humans</span>,
                <br />not the other way around
              </h1>
              
              <p className="mb-8 text-lg text-muted-foreground md:text-xl">
                Build stronger culture, increase accountability, and support continuous 
                professional growth—all in one beautiful, mobile-first app.
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild className="text-base" data-testid="button-get-started">
                  <a href="/api/login">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                How we drive <span className="border-b-4 border-primary">impact</span>
              </h2>
              <p className="text-muted-foreground">
                A complete toolkit for building stronger teams and driving professional growth.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div 
                  key={feature.title}
                  className="group rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/20"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to strengthen your team?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join Copilot Innovations and start building a better team culture today.
              </p>
              <Button size="lg" asChild data-testid="button-join-team">
                <a href="/api/login">
                  Join Your Team
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <img src={copilotLogo} alt="Copilot" className="h-6 w-6" />
              <span>Copilot Innovations</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
