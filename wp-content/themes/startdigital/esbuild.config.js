import esbuildServe from "esbuild-serve";

esbuildServe(
  {
    logLevel: "info",
    entryPoints: ["js/index.js"],
    bundle: true,
    outfile: "static/site.js",
  },
  { root: "templates" }
);
