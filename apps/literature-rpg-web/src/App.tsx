import { Badge } from "./components/ui/badge"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/card"
import { useStoryRuntime } from "./hooks/useStoryRuntime"

function App() {
  const { gameState, loading, error, step, reset } = useStoryRuntime()

  if (loading && !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="pt-6">
            <h1 className="text-xl text-red-400">Error: {error}</h1>
            <Button onClick={reset} className="mt-4">
              Restart
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="pt-6">
            <h1 className="text-xl text-red-400">State not found</h1>
            <Button onClick={reset} className="mt-4">
              Restart
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { currentNode, choices, resources, inventory, warnings } = gameState

  const health = resources.health ?? 0
  const mana = resources.mana ?? 0
  const gold = resources.gold ?? 0
  const turns = resources.turns ?? 0
  const cooldown = resources.heal_cooldown ?? 0
  const isDead = currentNode.id === "death"
  const isVictory = currentNode.id === "victory"

  const getEntityIcon = (id: string): string => {
    if (id.includes("spell")) return "✨"
    if (id === "lantern") return "🔦"
    if (id === "elixir") return "🧪"
    if (id === "lockpick") return "⚙️"
    if (id === "silver-shield") return "🛡️"
    if (id === "spirit-elixir") return "🔮"
    if (id === "rune-of-water") return "💧"
    return "🔑"
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      {/* Dynamic RPG HUD Status Bar */}
      {currentNode.id !== "entrance" && (
        <div className="w-full max-w-lg mb-4 flex flex-col gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
          {/* Engine Warnings */}
          {warnings && warnings.length > 0 && warnings.map((warning: string) => (
            <div key={warning} className="bg-red-950/80 border border-red-900 rounded p-2 text-center text-xs text-red-200 animate-pulse font-semibold">
              ⚠️ {warning}
            </div>
          ))}

          <div className="flex justify-between items-center gap-4">
            {/* HP Bar */}
            <div className="flex items-center gap-2 w-1/3">
              <span className="text-red-500 font-bold shrink-0 text-xs">❤️ {health} HP</span>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                ></div>
              </div>
            </div>
            {/* MP Bar */}
            <div className="flex items-center gap-2 w-1/3">
              <span className="text-cyan-500 font-bold shrink-0 text-xs">🧪 {mana} MP</span>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, mana * 2))}%` }}
                ></div>
              </div>
            </div>
            {/* Turn & Gold Counter */}
            <div className="flex justify-end gap-3 w-1/3 text-xs shrink-0 font-semibold">
              <span className="text-yellow-500">🪙 {gold}g</span>
              <span className="text-slate-400">🕒 Turn: {turns}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
            {/* Cooldown State */}
            <div>
              {cooldown > 0 ? (
                <span className="text-xs text-amber-500 font-medium">
                  ⏳ Heal Cooldown: {cooldown} turns
                </span>
              ) : (
                <span className="text-xs text-emerald-500 font-medium">✨ Spell Cast Ready</span>
              )}
            </div>
            {/* Badges */}
            <div className="flex gap-1 flex-wrap justify-end">
              {inventory.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Inventory empty</span>
              ) : (
                inventory.map((item: { id: string; label: string }) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="bg-amber-900/60 text-amber-100 hover:bg-amber-800 shrink-0 border border-amber-800/40 text-[10px] px-1.5 py-0.5"
                  >
                    {getEntityIcon(item.id)} {item.label}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/60 pb-3">
          <CardTitle className="text-xl text-slate-200">
            {isDead
              ? "💀 Defeat!"
              : isVictory
                ? "🎉 VICTORY!"
                : currentNode.id}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-4">
          {isDead ? (
            <p className="text-slate-400 leading-relaxed text-md">
              You have succumbed to your wounds inside the library passage. Your vision fades into
              cold darkness...
            </p>
          ) : currentNode.blocks && currentNode.blocks.length > 0 ? (
            currentNode.blocks.map((block: any) => {
              return (
                <div
                  key={block.id}
                  className="flex flex-col gap-2 p-2 rounded hover:bg-slate-800/40 transition"
                >
                  {block.type === "header" && (
                    <h3 className="text-lg font-bold text-slate-200">{block.text}</h3>
                  )}
                  {block.type === "paragraph" && (
                    <p className="text-slate-400 leading-relaxed text-md">{block.text}</p>
                  )}
                  {block.type === "image" && (
                    <div className="rounded overflow-hidden border border-slate-800">
                      <img
                        src={block.url}
                        alt={block.caption}
                        className="w-full h-auto object-cover max-h-48"
                      />
                      {block.caption && (
                        <p className="text-xs text-slate-500 p-1 bg-slate-950/40">
                          {block.caption}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            // Fallback if no blocks
            <p className="text-slate-400 leading-relaxed text-md">
              (No content blocks found)
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4 border-t border-slate-800 bg-slate-950/20">
          {isDead || isVictory || choices.length === 0 ? (
            <div className="w-full text-center space-y-3 py-2">
              <div className="text-emerald-400 text-md font-semibold">
                {isDead
                  ? "💥 GAME OVER 💥"
                  : isVictory
                    ? "🏆 ADVENTURE COMPLETE 🏆"
                    : "✨ You have reached the end. ✨"}
              </div>
              <Button
                onClick={reset}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 text-sm font-semibold rounded"
              >
                Play Again
              </Button>
            </div>
          ) : (
            choices.map((choice: any) => (
              <Button
                key={choice.id}
                onClick={() => step(choice)}
                className="w-full justify-start text-left h-auto py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-800 hover:border-slate-700 rounded transition text-sm"
              >
                <span className="mr-2 text-slate-500">➤</span> {choice.label}
              </Button>
            ))
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default App
