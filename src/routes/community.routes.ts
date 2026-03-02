import { Router } from 'express'
import * as CommunityController from '../controllers/community.controller'

const router = Router()

router.get('/', CommunityController.listCommunities)
router.get('/:slug', CommunityController.getCommunityBySlug)

export default router
