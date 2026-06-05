import { useStoryRuntime } from "./hooks/useStoryRuntime";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

function App() {
  const { currentNode, availableChoices, step, reset, context } = useStoryRuntime();

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

  // Figure out what we have active from the derived state (e.g. 'lantern')
  const inventory = Array.from(context.derivedState.effectiveEntityIds).filter(id => id !== 'dark-cave');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      
      {inventory.length > 0 && (
        <div className="w-full max-w-lg mb-4 flex gap-2">
          {inventory.map(item => (
            <Badge key={item} variant="secondary" className="bg-amber-900 text-amber-100 hover:bg-amber-800">
              🔦 {item}
            </Badge>
          ))}
        </div>
      )}

      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-200">
            {(currentNode.properties as any)?.title ?? currentNode.id}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-slate-400 leading-relaxed text-lg">
            {(currentNode.properties as any)?.body as string}
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6 border-t border-slate-800 mt-4">
          {availableChoices.length === 0 ? (
            <div className="w-full text-center space-y-4">
              <div className="text-emerald-400 text-lg">✨ You have reached the end. ✨</div>
              <Button onClick={reset} variant="outline" className="w-full text-slate-900">
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
                  className="w-full justify-start text-left h-auto py-3 bg-slate-800 hover:bg-slate-700 text-slate-200"
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
