import { chatRoutes } from "./routes/chat";
import { quizRoutes } from "./routes/quiz";
import { flashcardRoutes } from "./routes/flashcards";
import { smartnotesRoutes } from "./routes/notes";
import { podcastRoutes } from "./routes/podcast";
import { examRoutes } from "./routes/examlab";
import { transcriberRoutes } from "./routes/transcriber";
import { plannerRoutes } from "./routes/planner";
import { debateRoutes } from "./routes/debate";

export function registerRoutes(app: any) {
  chatRoutes(app);
  quizRoutes(app);
  examRoutes(app);
  podcastRoutes(app);
  flashcardRoutes(app);
  smartnotesRoutes(app);
  transcriberRoutes(app);
  plannerRoutes(app);
  debateRoutes(app);
}
