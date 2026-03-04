import { Router } from "express";
import * as BattleController from "../controllers/battle.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { optionalAuthMiddleware } from "../middlewares/optionalAuth.middleware";

const router = Router()

router.get("/", BattleController.getBattles)
router.post("/", authMiddleware, BattleController.createBattle)
router.get("/my-votes", authMiddleware, BattleController.getMyVotes)
router.get("/today", BattleController.getTodaysBattles)
router.post("/advance", authMiddleware, BattleController.advanceTournament)
router.get("/:id", optionalAuthMiddleware, BattleController.getBattleDetails)
router.post("/:id/vote", authMiddleware, BattleController.voteBattle)

export default router