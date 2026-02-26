import { Router } from "express";
import { optionalAuthMiddleware } from "../middlewares/optionalAuth.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as AnimeController from "../controllers/anime.controller";
import * as ReactionController from "../controllers/reaction.controller";

const router = Router()

// Static routes MUST come before /:id
router.get("/search", optionalAuthMiddleware, AnimeController.searchAnime)
router.get("/trending", optionalAuthMiddleware, AnimeController.getTrending)
router.get("/popular", optionalAuthMiddleware, AnimeController.getPopular)
router.post("/batch", optionalAuthMiddleware, AnimeController.batchAnime)

router.get("/", optionalAuthMiddleware, AnimeController.getAnimeList)
router.get("/:id", optionalAuthMiddleware, AnimeController.getAnimeDetails)
router.get("/:id/sentiment", optionalAuthMiddleware, ReactionController.getAnimeSentiment)

export default router