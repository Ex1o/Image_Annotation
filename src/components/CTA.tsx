import { motion } from "framer-motion";

const CTA = () => {
  return (
    <section className="py-24 bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="container relative z-10 text-center"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-hero-foreground mb-4">
          Ready to Build Your Model?
        </h2>
        <p className="text-hero-muted max-w-md mx-auto mb-8">
          Start for free — no credit card required. Build, train, and deploy in minutes.
        </p>
        <button className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-elevated">
          Sign Up
        </button>
      </motion.div>
    </section>
  );
};

export default CTA;
