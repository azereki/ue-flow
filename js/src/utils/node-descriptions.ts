/** Static descriptions for common Blueprint node types. No AI required. */
export const NODE_DESCRIPTIONS: Record<string, string> = {
  // Events
  'Event BeginPlay': 'Fires once when the actor is spawned or the level starts. Use for initialization logic.',
  'Event Tick': 'Fires every frame. Delta Seconds provides the time since the last tick. Avoid heavy logic here.',
  'Event EndPlay': 'Fires when the actor is destroyed or removed from the world.',
  'Event ActorBeginOverlap': 'Fires when another actor starts overlapping this actor. Requires collision enabled.',
  'Event ActorEndOverlap': 'Fires when another actor stops overlapping this actor.',
  'Event AnyDamage': 'Fires when this actor takes any type of damage.',
  'Event Hit': 'Fires when this actor collides with something in the world.',

  // Flow Control
  'Branch': 'Executes the True or False output depending on the Condition boolean input.',
  'Sequence': 'Executes each output pin in order (Then 0, Then 1, etc.). All outputs fire before the next node continues.',
  'For Each Loop': 'Iterates over each element in an array. Loop Body fires per element, Completed fires after all.',
  'For Loop': 'Loops from First Index to Last Index. Loop Body fires each iteration with the current Index.',
  'While Loop': 'Repeats Loop Body as long as Condition is true. Be careful of infinite loops.',
  'Do Once': 'Executes the output only the first time. Can be reset via the Reset input.',
  'Do N': 'Executes the output only N times. Counter tracks how many times it has fired.',
  'Gate': 'Controls flow — Open allows execution through, Close blocks it. Toggle switches between.',
  'Flip Flop': 'Alternates between outputs A and B on each execution.',
  'Multi Gate': 'Routes execution to one of several outputs, cycling through them.',
  'Delay': 'Pauses execution for the specified Duration (seconds), then continues. Latent — does not block the game.',
  'Retriggerable Delay': 'Like Delay, but resets the timer if called again before it completes.',
  'Select': 'Returns one of several values based on an index. Like a switch expression.',
  'Switch on Int': 'Routes execution based on an integer value to matching output pins.',
  'Switch on String': 'Routes execution based on a string value to matching output pins.',
  'Switch on Enum': 'Routes execution based on an enum value to matching output pins.',

  // Functions
  'Print String': 'Prints text to the screen and/or output log. Useful for debugging.',
  'Destroy Actor': 'Removes this actor from the world. Cannot be undone.',
  'Spawn Actor from Class': 'Creates a new actor of the specified class at the given Transform.',
  'Get Actor Location': 'Returns the current world position of this actor as a Vector.',
  'Set Actor Location': 'Moves this actor to the specified world position.',
  'Get Actor Rotation': 'Returns the current world rotation of this actor as a Rotator.',
  'Set Actor Rotation': 'Sets the world rotation of this actor.',
  'Get Player Controller': 'Returns the player controller for the specified Player Index (0 for first player).',
  'Get Player Character': 'Returns the player character pawn for the specified Player Index.',
  'Get Game Mode': 'Returns a reference to the current Game Mode.',
  'Cast To': 'Attempts to convert an object reference to a more specific type. Fails if the object is not that type.',
  'Is Valid': 'Checks whether an object reference is valid (not null and not pending kill).',
  'Self': 'Returns a reference to the Blueprint actor that owns this graph.',
  'Get World Delta Seconds': 'Returns the time elapsed since the last frame in seconds.',
  'Set Timer by Function Name': 'Starts a timer that calls the named function after the specified time.',
  'Clear Timer by Function Name': 'Stops a previously set timer.',

  // Math
  'Make Vector': 'Constructs a Vector from individual X, Y, Z float values.',
  'Break Vector': 'Splits a Vector into its individual X, Y, Z float components.',
  'Make Rotator': 'Constructs a Rotator from Roll, Pitch, and Yaw values.',
  'Break Rotator': 'Splits a Rotator into its Roll, Pitch, and Yaw components.',
  'Make Transform': 'Constructs a Transform from Location, Rotation, and Scale.',
  'Break Transform': 'Splits a Transform into its Location, Rotation, and Scale components.',
  'Lerp (Float)': 'Linearly interpolates between A and B by Alpha (0.0 = A, 1.0 = B).',
  'Clamp': 'Constrains a value to lie between Min and Max.',
  'Random Float in Range': 'Returns a random float between Min and Max.',
  'Normalize': 'Returns the unit vector (length 1) in the same direction.',

  // Components
  'Set Visibility': 'Shows or hides a scene component and optionally its children.',
  'Set Active': 'Activates or deactivates a component.',
  'Add Impulse': 'Applies an instant physics impulse to a primitive component.',
  'Add Force': 'Applies a continuous physics force to a primitive component.',

  // Timeline
  'Timeline': 'Plays a curve-driven animation over time. Has Play, Reverse, Stop inputs and Update, Finished outputs.',
};

/** Look up a static description by node title (case-insensitive). */
export function getNodeDescription(title: string): string | undefined {
  // Direct lookup
  if (NODE_DESCRIPTIONS[title]) return NODE_DESCRIPTIONS[title];

  // Case-insensitive fallback
  const lower = title.toLowerCase();
  for (const [key, desc] of Object.entries(NODE_DESCRIPTIONS)) {
    if (key.toLowerCase() === lower) return desc;
  }

  // Partial match for "Event X" style titles
  if (lower.startsWith('event ')) {
    const eventName = title.slice(6);
    for (const [key, desc] of Object.entries(NODE_DESCRIPTIONS)) {
      if (key.toLowerCase() === `event ${eventName.toLowerCase()}`) return desc;
    }
  }

  return undefined;
}
