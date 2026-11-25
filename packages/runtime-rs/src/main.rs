use std::io::{self, BufRead, Write};

use fiction_map_runtime::blueprint::EnumerationRequest;
use fiction_map_runtime::enumerate_paths;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut output = io::BufWriter::new(io::stdout().lock());
    for line in io::stdin().lock().lines() {
        let request: EnumerationRequest = serde_json::from_str(&line?)?;
        serde_json::to_writer(&mut output, &enumerate_paths(&request))?;
        writeln!(output)?;
    }
    output.flush()?;
    Ok(())
}
