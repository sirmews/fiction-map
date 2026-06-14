import { useStoryRuntime } from "./hooks/useStoryRuntime";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

function App() {
  const { currentNode, availableChoices, step, reset, context, state } = useStoryRuntime();

  if (!currentNode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="pt-6">
            <h1 className="text-xl text-red-400">Error: Node not found</h1>
            <Button onClick={reset} className="mt-4">Restart</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get dynamic state variables
  const health = state.entityState?.resources?.health ?? 0;
  const mana = state.entityState?.resources?.mana ?? 0;
  const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
  const isDead = state.currentNodeId === "death";
  const isVictory = state.currentNodeId === "victory";

  // Figure out what we have active from the derived state (e.g. 'lantern')
  const inventory = Array.from(context.derivedState.ownedEntityIds);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      
      {/* Dynamic RPG HUD Status Bar */}
      {state.currentNodeId !== "entrance" && (
        <div className="w-full max-w-lg mb-4 flex flex-col gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-center gap-4">
            {/* HP Bar */}
            <div className="flex items-center gap-2 w-1/2">
              <span className="text-red-500 font-bold shrink-0 text-sm">❤️ {health} HP</span>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                ></div>
              </div>
            </div>
            {/* MP Bar */}
            <div className="flex items-center gap-2 w-1/2">
              <span className="text-cyan-500 font-bold shrink-0 text-sm">🧪 {mana} MP</span>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-cyan-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, mana * 2))}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
            {/* Cooldown State */}
            <div>
              {cooldown > 0 ? (
                <span className="text-xs text-amber-500 font-medium">⏳ Heal Cooldown: {cooldown} turns</span>
              ) : (
                <span className="text-xs text-emerald-500 font-medium">✨ Spell Cast Ready</span>
              )}
            </div>
            {/* Badges */}
            <div className="flex gap-1 flex-wrap justify-end">
              {inventory.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Inventory empty</span>
              ) : (
                inventory.map(item => {
                  const icon = item.includes("spell") ? "✨" : item === "lantern" ? "🔦" : item === "elixir" ? "🧪" : "🔑";
                  return (
                    <Badge key={item} variant="secondary" className="bg-amber-900/60 text-amber-100 hover:bg-amber-800 shrink-0 border border-amber-800/40 text-[10px] px-1.5 py-0.5">
                      {icon} {item}
                    </Badge>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-200">
            {((currentNode.properties as any)?.title ?? currentNode.id)}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-slate-400 leading-relaxed text-lg">
            {((currentNode.properties as any)?.body as string)}
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6 border-t border-slate-800 mt-4">
          {isDead || isVictory || availableChoices.length === 0 ? (
            <div className="w-full text-center space-y-4">
              <div className="text-emerald-400 text-lg font-semibold">
                {isDead ? "💥 GAME OVER 💥" : isVictory ? "🎉 VICTORY! 🎉" : "✨ You have reached the end. ✨"}
              </div>
              <Button onClick={reset} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3">
                Play Again
              </Button>
            </div>
          ) : (
            availableChoices.map((choice) => {
              const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
              return (
                <Button 
                  key={choice.id} 
                  onClick={() => step(choice)}
                  className="w-full justify-start text-left h-auto py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
                >
                  <span className="mr-2 text-slate-500">➤</span> {label}
                </Button>
              );
            })
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
