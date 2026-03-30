import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUpload } from "@/contexts/UploadContext";
import UploadZone from "@/components/UploadZone";
import heroImg from "@/assets/hero-detection.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const { addFiles } = useUpload();

  const handleFiles = (files: File[]) => {
    addFiles(files);
    navigate("/build");
  };

  return (
    <section className="relative bg-hero pt-32 pb-20 overflow-hidden">
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-hero-foreground leading-tight mb-4">
            Build a{" "}
            <span className="text-primary">Computer Vision</span>{" "}
            Model in Minutes
          </h1>
          <p className="text-lg text-hero-muted max-w-xl mx-auto">
            Upload images, auto-detect objects, and generate high-quality annotations — no ML setup required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <UploadZone onFilesSelected={handleFiles} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-elevated border border-upload-dashed"
        >
          <img
            src={heroImg}
            alt="Computer vision object detection demo showing cars and bicycles"
            className="w-full h-auto"
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
