import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        movies: resolve(__dirname, "movies.html"),
        hallTags: resolve(__dirname, "hall-tags.html"),
        hallCalendar: resolve(__dirname, "hall-calendar.html"),
        hallScore: resolve(__dirname, "hall-score.html"),
        movie: resolve(__dirname, "movie.html"),
        about: resolve(__dirname, "about.html")
      }
    }
  }
});
