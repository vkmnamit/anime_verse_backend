import { Router } from "express";
import * as AnimeController from "../controllers/anime.controller";

const router = Router()

router.get("/", AnimeController.getAnimeList)
router.get("/search", AnimeController.searchAnime)
router.get("/:id", AnimeController.getAnimeDetails)

export default router