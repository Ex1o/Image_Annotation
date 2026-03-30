import { Zap, Target, Layers, Download, MousePointer2, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Zap, title: "YOLOv8 Auto-Detection", desc: "Automatically detect 80+ object classes instantly with state-of-the-art AI." },
  { icon: Target, title: "Smart Search", desc: "Search for specific objects like 'car', 'person', or 'dog' and detect only what you need." },
  { icon: MousePointer2, title: "Manual Annotation", desc: "Draw bounding boxes and polygons manually for custom annotations." },
  { icon: Layers, title: "Instance Segmentation", desc: "Get pixel-perfect segmentation masks for detected objects." },
  { icon: Download, title: "Multi-Format Export", desc: "Export annotations in YOLO, COCO JSON, or Pascal VOC formats." },
  { icon: ImageIcon, title: "Batch Processing", desc: "Process multiple images at once with consistent annotation quality." },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Everything You Need</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-7 border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
