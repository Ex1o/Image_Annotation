import { Upload, Cpu, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Data",
    description: "Upload images. We accept common formats — just drag and drop.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Auto-Label & Train",
    description: "Detect objects and generate bounding boxes and segmentation masks automatically.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Deploy & Use",
    description: "Review, edit annotations, and export in formats like YOLO, COCO, or VOC.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Three Simple Steps</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative bg-card rounded-2xl p-8 shadow-card border border-border hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 group"
            >
              <span className="text-6xl font-black text-muted/60 absolute top-4 right-6">{s.step}</span>
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
                <s.icon className="w-6 h-6 text-accent-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
