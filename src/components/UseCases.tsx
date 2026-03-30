import { motion } from "framer-motion";
import ex1 from "@/assets/example-1.jpg";
import ex2 from "@/assets/example-2.jpg";
import ex3 from "@/assets/example-3.jpg";
import ex4 from "@/assets/example-4.jpg";

const cases = [
  { img: ex1, title: "Sports Analytics", desc: "Track player movements and analyze game strategy in real-time." },
  { img: ex2, title: "Warehouse & Logistics", desc: "Automate inventory counting and detect misplaced items." },
  { img: ex3, title: "Manufacturing QA", desc: "Use object detection and segmentation to inspect products." },
  { img: ex4, title: "Smart Cities", desc: "Monitor pedestrian flow, vehicle traffic, and urban activity." },
];

const UseCases = () => {
  return (
    <section id="use-cases" className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Use Cases</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Built for Every Industry</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl overflow-hidden bg-card border border-border hover:shadow-elevated transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={c.img}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-card-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
