import { onMounted, onUnmounted } from 'vue'
import { Stage } from '@/three/core/Stage'
import type { MuseumScene } from '@/three/core/MuseumScene'

// Standard scene lifecycle for views: build + mount on enter,
// guaranteed dispose on leave (spec §91). Vue only expresses intent —
// it never touches per-frame 3D data (spec §57–§58).

export function useStageScene(factory: () => MuseumScene | Promise<MuseumScene>) {
  let scene: MuseumScene | null = null

  onMounted(async () => {
    try {
      scene = await factory()
      await Stage.setScene(scene)
    } catch (err) {
      console.error('[useStageScene] scene failed', err)
    }
  })

  onUnmounted(() => {
    Stage.clearScene()
    scene = null
  })
}
