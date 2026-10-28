// A twelve-line example file, as an Ant's CI would compile it.
use ready_ant::Thing;
fn main() {
    let thing = Thing::new("hello");
    thing.configure();
    thing.run();
    let answer = thing.result();
    println!("{answer}");
    // lines 3 to 8 are shown on the card
    thing.close();
    drop(thing);
}
