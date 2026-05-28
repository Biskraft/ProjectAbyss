## Page 1



## Page 2

### An Architectural


Approach to Level Design, Second Edition

## Page 3



## Page 4

### An Architectural


Approach to Level Design, Second Edition By 

### Christopher W. Totten

## Page 5

### CRC Press


Taylor & Francis Group 6000 Broken Sound Parkway NW, Suite 300 Boca Raton, FL 33487-2742 2019 by Taylor & Francis Group, LLC 

### CRC Press is an imprint of Taylor & Francis Group, an Informa business


No claim to original U.S. Government works Printed on acid-free paper International Standard Book Number-13: 978-081-5361-374 (Hardback) International Standard Book Number-13: 978-081-5361-367 (Paperback) This book contains information obtained from authentic and highly regarded sources. Reasonable efforts have been made to publish reliable data and information, but the author and publisher cannot assume responsibility for the validity of all materials or the consequences of their use. The authors and publishers have attempted to trace the copyright holders of all material reproduced in this publication and apologize to copyright holders if permission to publish in this form has not been obtained. If any copyright material has not been acknowledged, please write and let us know so we may rectify in any future reprint. Except as permitted under U.S. Copyright Law, no part of this book may be reprinted, reproduced, trans- mitted, or utilized in any form by any electronic, mechanical, or other means, now known or hereafter invented, including photocopying, microfilming, and recording, or in any information storage or retrieval system, without written permission from the publishers. For permission to photocopy or use material electronically from this work, please access www.copyright. com (http://www.copyright.com/) or contact the Copyright Clearance Center, Inc. (CCC), 222 Rosewood Drive, Danvers, MA 01923, 978-750-8400. CCC is a not-for-profit organization that provides licenses and registration for a variety of users. For organizations that have been granted a photocopy license by the CCC, a separate system of payment has been arranged. Trademark Notice:  Product or corporate names may be trademarks or registered trademarks, and are used only for identification and explanation without intent to infringe. Library of Congress Cataloging-in-Publication Data Names: Totten, Christopher W., author. 

### Title: An Architectural approach to level design : processes and experiences /


Christopher W. Totten. Description: Second edition. | Boca Raton : Taylor & Francis, CRC Press, 2019. | Includes bibliographical references and index. Identifiers: LCCN 2018059043| ISBN 9780815361367 (pbk. : alk. paper) | ISBN 9780815361374 (hardback : alk. paper) | ISBN 9781351116305 (ebook : alk. paper) Subjects: LCSH: Level design (Computer science) | Software architecture. Classification: LCC QA76.76.C672 T679 2019 | DDC 005.1/2--dc23 LC record available at https://lccn.loc.gov/2018059043 Visit the Taylor & Francis Web site at 

### http://www.taylorandfrancis.com


and the CRC Press Web site at http://www.crcpress.com

## Page 6

### For Adeline and Margaret, our little player 1 and 2

## Page 7



## Page 8

Contents Foreword, xix 

### Acknowledgments, xxv


About the Author, xxvii Introduction, xxix C hapter  1    A Brief History of Architecture and Level Design  1 

### BREAKING THE RULES OF LEVEL DESIGN  2


AN EXPERIENTIAL HISTORY OF ARCHITECTURE  5 Elements of Architecture and Level Design  7 Functional Requirements  7 Usability  7 Delight  7 

### The Beginnings of Architectural Sight Lines  8


Architecture as Representation in Ancient Mesopotamia  10 Architecture as Statement in Ancient Egypt  11 Spatial and Symbolic Relationships in Greek Architecture  13 Indian, Southeast Asian, and Asian Representational Architecture  17 Linear Experiences in Roman Architecture  19 Medieval Christian and Islamic Symbolic Architecture  21 The Renaissance Return to Human-Centered Architecture  23 Ornamental Reformations and Material Revolutions  25 THE HISTORY OF GAMESPACES  29 Board Design for Early Games  30 

### vii

## Page 9

### viii  ◾  Contents


Physical Gamespaces and Architecture  31 

### Digital Gamespaces  32


WAYS OF SEEING FOR LEVEL DESIGN  37 

### SUMMARY  40


EXERCISES  40 ENDNOTES  41 INDUSTRY PERSPECTIVES  44 D  r . U mran  a li 

### C hapter  2  ◾  Drawing for Level Designers  51


LEVEL DESIGN GOALS  51 Adjusting Player Behavior  53 

### Transmitting Meaning  56


Augmentation of Space  57 NON-DIGITAL LEVEL DESIGN TECHNIQUES  59 Basic Drawing Techniques  60 How to Draw a Line  61 Contours and Line Weights  62 Drawing with References  63 Shading  63 Hierarchical Drawing  64 

### Types of Architectural Drawings  65


Plan  65 Section  67 Elevation  68 Axonometric  69 Perspective  71 

### Sketching and Journal Writing  73


Designing on Paper  75 Notation Methods for Level Design  77 Proximity Diagrams  77 Concept Diagrams  79 Game-Mapping  82

## Page 10

### Contents  ◾  ix


Flow Charts  83 Mark Brown’s Boss Keys diagrams  85 DIGITAL LEVEL DESIGN TOOLS  88 CAD Programs  89 

### Digital Art Programs  92


Engine Primitives and Placeholder Art  93 3D Modeling Programs  97 SUMMARY  100 

### EXERCISES  100


ENDNOTES  101 INDUSTRY PERSPECTIVES  103 r obin  -Y ann  S torm 

### C hapter  3  ◾  Level Design Workflows  109


FORM FOLLOWS FUNCTION  109 Form Follows Core Mechanics  110 

### Level Progression with Scaffolding Mechanisms  114


LEVEL DESIGN WORKFLOWS  115 Level Design Parti  115 

### Non-Digital Prototypes  124


Digital Prototypes with Grayboxing  125 Pacing Your Levels with the  Nintendo Power  Method  126 Iterative Design with Playtesting  130 Modular Level Design  132 LEVEL DESIGN SCHEDULING  135 The Toy Box  136 

### Building from the Middle  137


Building in Order  139 SUMMARY  140 

### EXERCISES  141


ENDNOTES  142

## Page 11

### x  ◾  Contents


C hapter  4    Basic Gamespaces  145 

### ARCHITECTURAL SPATIAL ARRANGEMENTS  146


FigureGround  146 

### Form–Void  151


Arrivals  151 Genius Loci  153 HISTORIC GAMESPACE STRUCTURES  155 Labyrinth  155 

### Maze  156


Rhizome  159 SPATIAL SIZE TYPES  161 Narrow Space  161 

### Intimate Space  163


Prospect Space  166 MOLECULE LEVEL SPACES  168 The Basics of Molecule Design  168 

### Spatial Types as Molecule Nodes and Edges  169


HUB SPACES  174 

### SANDBOX GAMESPACES  176


Pathfinding with Architectural Weenies  177 

### Organizing the Sandbox: Kevin Lynch’s Image of the City  179


Landmarks  180 Paths  180 Nodes  182 Edges  183 Districts  185 WORKING WITH CAMERA VIEWS  186 3D Views  187 First Person  188 Third Person  189 

### 2D Views  191


Side-Scrolling Space  192

## Page 12

### Contents  ◾  xi


Top-Down Space  194 

### Axonometric/Isometric Views  196


ENEMIES AS ALTERNATIVE ARCHITECTURE  198 

### SUMMARY  200


EXERCISES  201 ENDNOTES  201 INDUSTRY PERSPECTIVES  205 J err Y  b eli C h 

### C hapter  5  ◾  Communicating through Environment Art  213


TEACHING THEORIES FOR GAME LEVELS  214 Behavior Theory and Operant Conditioning  214 

### Montessori Method  216


Constructivism  219 SYMBOLS AND VISUAL DESIGN IN GAMES  222 Implementing Symbols in Games  223 

### Teaching with Symbols in Games  225


Introducing Symbols  225 Symbols as Guides  227 

### Designing and Placing Symbols for


Effective Communication  230 Basic Color Theory  230 Contrast  232 Framing  233 Rule of Thirds  234 ARCHITECTURAL FORMS AND TYPES  236 

### CONTROLLING INFORMATION IN MEMORY PALACES  238


Certainty  239 

### Uncertainty  240


Risk  242 Putting It All Together in a Memory palace  243 SUMMARY  245 

### EXERCISES  245

## Page 13

### xii  ◾  Contents


ENDNOTES  246 INDUSTRY PERSPECTIVES  249 C hapter  6    Building Exciting Levels with Dangerous 

### Architecture  257


SURVIVAL INSTINCTS AND GAME COMPLEXITY  258 Maslow’s Hierarchy of Needs  261 

### “Bad Spaces”: Vulnerability as a Game Mechanic  261


Vulnerability as a Game Structure  262 Vulnerability in Individual Game Challenges  263 PROSPECT AND REFUGE SPATIAL DESIGN  265 Creating Paths with Refuges, Prospects, and Secondary Refuges  266 

### Prospects and Refuges in Architecture  268


Prospects and Refuges in Video Games  272 SHADE, SHADOW, AND AMBIGUITY  277 Shade  279 

### Shadow  282


Negative Space  285 LOVING AND HATING HEIGHT  287 

### SUMMARY  290


EXERCISES  292 ENDNOTES  292 INDUSTRY PERSPECTIVES  295 C  am D en  b a Y er 

### C hapter  7  ◾  Rewards in Gamespaces  299


THE PURPOSE OF REWARDS  300 Incentivizing In-Game Behaviors  300 

### Enticing Exploration  301


Creating a Sense of Curiosity  302 THE TYPES OF REWARDS IN GAMESPACES  304 Reward Vaults  305 

### Rewarding Vistas  306

## Page 14

### Contents  ◾  xiii


Meditative Space  307 

### Narrative Stages  308


MAKING REWARDS EXCITING THROUGH DENIAL  309 Zen Views  309 

### Frank Lloyd Wright’s Hanna House  312


Religious Structures and Eastern Garden Design  313 Layered Walls  316 Oku  317 GOALS AND REWARD SCHEDULES  318 Long- and Short-Term Goals  319 

### The Rod of Many Parts  320


Reward Schedules  320 SUMMARY  321 

### EXERCISES  322


ENDNOTES  322 C hapter  8    Level 11: The Tutorial Level  325 

### THE MANY FUNCTIONS OF FIRST LEVELS  326


Architectural Arrivals  326 

### Interactive Arrivals  328


BUILDING BLOCKS FOR TUTORIAL DESIGN  330 Spatial Building Blocks  331 Scenes  331 Portals and Thresholds  334 Controlled Approaches  337 Meeting Spaces  338 

### Behavioral building blocks  340


Rewards in Tutorials  340 Access as a First Level Reward  343 

### Montessori Building Blocks  345


Constructivist Building Blocks  348 Proximity of Checkpoints  348

## Page 15

### xiv  ◾  Contents


DETERMINING PLAYER NEEDS  350 PLAYTESTING IN-GAME TEACHING  352 A Literature Game for Those Who Have Not Read the Book  352 

### Teaching Molecular Immunology in Only Four Levels  355


Developing Concepts into Challenges in a Math Game  356 Puzzles as Problems, Levels as Lessons  357 Four-Step Tutorial Design  358 TUTORIAL ASSETS AND MEDIA  361 Effective Visual Elements  362 

### Audio Elements  364


TEACHING GAMEPLAY THROUGH ADVERTISING 

### METHODS  368


Demonstrative Advertising with Scripted Events and Triggers  368 

### Illustrative Advertising through Environmental Narrative  370


Associative Advertising as Deconstruction  371 SUMMARY  374 

### EXERCISES  374


ENDNOTES  376 INDUSTRY PERSPECTIVES  379 m elanie  S tegman ,  p h .D. 

### C hapter  9  ◾  Storytelling in Gamespaces  387


EXPRESSIVE DESIGN  388 Narrative Design and Worldbuilding  390 

### Narrative Worldbuilding in Games  391


MECHANICS VS. MOTIF  393 Narrative as a Generator of Design  393 

### Mechanics vs. Story Narrative  394


Mechanics vs. Gameplay Narrative  396 NARRATIVE SPACES  398 Evocative Spaces  399 

### Staging Spaces  401


Embedded Spaces  402

## Page 16

### Contents  ◾  xv


Resource-Providing Spaces  404 ENVIRONMENT ART STORYTELLING  406 Storytelling with Modular Assets  407 

### Environment Art and Cinematography  409


MATERIALITY AND THE HERO’S JOURNEY  411 

### PACING AND NARRATIVE REWARDS  416


The Dramatic Arc as a Pacing Tool  416 

### Rewarding Exploration with Embedded Narrative  418


Rewarding Exploration with Optional Narrative and Easter Eggs  418 SUMMARY  420 

### EXERCISES  420


ENDNOTES  421 INDUSTRY PERSPECTIVES  425 K  elli  D U nlap ,  p SY D 

### C hapter  10  ◾  Possibility Spaces and Worldbuilding  429


UNDERSTANDING IMMERSION AND PLAYER INDIVIDUALITY  430 The Immersive Fallacy  431 

### Player Personalities  432


ARCHITECTURAL PHENOMENOLOGY AND PLAY  433 

### EMERGENT SPACES  436


Emergence  437 

### Possibility Spaces  438


MINIATURE GARDEN AESTHETIC  439 Overviews  441 Overviews in Historic Games  442 Overviews in 3D  442 

### Tours  445


Possibility Space and Procedural Literacy  446 JAPANESE GARDEN DESIGN AND WORLDBUILDING  449 Points of View in Japanese Gardens  451 

### Scenic Effects  453

## Page 17

### xvi  ◾  Contents


Sensory Effects  454 OFFERING EXPERIENTIAL CHOICE  458 Introducing Choice  458 

### Intelligible Choice  459


Shaping Choice, Risk, and Reward  460 “Metroidvania”: Worlds of Rewards and Possibility  462 DEGENERATIVE DESIGN  467 

### SUMMARY  468


EXERCISES  469 ENDNOTES  470 C hapter  11    Working with Procedurally Generated Levels  475 

### HOW I LEARNED TO STOP WORRYING AND LOVE PCG  476


PATTERN LANGUAGES  480 Patterns in Game Design  481 

### Working with Patterns in Level Design  482


BLENDING HANDMADE DESIGN WITH PROCEDURAL 

### GENERATION  484


Scenes as Patterns  485 

### Combining Handmade Design and PCG  487


Night of the Living Handmade/PCG Case Studies  488 PCG Alternative Architecture in  Left 4 Dead  488 Mixing Methodologies in  Dead Man’s Trail  489 SUMMARY  493 

### EXERCISES  494


ENDNOTES  494 INDUSTRY PERSPECTIVES  496 C hapter  12    Influencing Social Interaction with Level 

### Design  503


EMERGENCE AND SOCIAL INTERACTION  504 LEARNING FROM URBAN EMERGENCE  508 Modernism and Non-Emergent Cities  509

## Page 18

### Contents  ◾  xvii


Jane Jacobs and Mixed-Use Emergent Neighborhoods  512 

### Integrating Urban Design into Multiplayer Gamespace  514


THE IMPORTANCE OF SPAWN POINTS AND QUEST HUBS  519 Shaping with Spawn Points  519 

### Shaping Player Interaction with Quest Hubs  520


Enticing Exploration with Side Quests  521 HOUSES, HOMES, AND HOMETOWNS IN GAMES  523 

### SUMMARY  525


EXERCISES  525 ENDNOTES  526 C hapter  13    Sound, Music, and Rhythm in Level Design  529 

### THE ROLE OF RHYTHM IN GAMES AND BUILDINGS  530


Mood and Music  531 

### Rhythm and Interactive Sound  535


Rhythmic Entrainment in Games and Spaces  537 Varying Structural Rhythms  538 COMPLEMENTING LEVEL DESIGN WITH AMBIENT SOUND  542 2D Sound  542 

### 3D Sound  543


ENHANCING GAMEPLAY EXPERIENCES WITH SOUND 

### DESIGN  545


Sound as Gameplay Feedback  547 

### Sound as Reward  548


Sound as Narrative Indicators  550 SUMMARY  550 

### EXERCISES  551


ENDNOTES  552 CONCLUSION, 555 INDEX, 557

## Page 19



## Page 20

Foreword 

### rian upton, freelance game Designer, Owner—Upton Games


B You never know what’s going to turn out to be useful. Part of what makes designing games so challenging is that the skill set required to do it well is essentially unbounded. It’s hard to draw a clean line around a body of knowledge and say “this is all you need to know to design games” because, depending on the type of game you’re making, all sorts of strange and unusual knowledge can turn out to be extremely useful. Maybe it’s an encyclopedic knowledge of the politics of the late Roman Empire. Or maybe it’s a fascination with the economics of nineteenth- century railroads. Or maybe it’s a lifelong obsession with romance novel tropes. Having a head packed with all sorts of obscure and seemingly irrel- evant facts can be incredibly helpful if you’re a professional game designer. And that’s true even if the game you’re working on doesn’t have a direct connection to your personal mental trivia collection. Knowing about the fall of Rome doesn’t just help you make games about the fall of Rome, but about any game set in a world where central power is on the wane and local strongmen are stepping in to fill the vacuum. Knowing about railroad robber barons doesn’t just help you make games about railroad robber barons, but also about any situation involving exponential eco- nomic grown and the struggle between capital and labor. Knowing about romance tropes doesn’t just help you create period dating simulations, but also any game where players are expected to develop an emotional attach- ment to the NPCs they encounter. You never know what’s going to turn out to be useful. Architecture is one of those things. At first glance, it might not seem as though real-world architecture would matter much to game design. After all, video game levels are constructed out of polygons and textures, not bricks and mortar. We don’t have to worry if the structures we invent xix

## Page 21

### xx  ◾  Foreword


for our games are structurally sound or economically feasible. With a few 

### mouse clicks we can create mile-high skyscrapers that would bankrupt


any real-world developer who tried to build them, and that would col- lapse under their own weight if they actually were built. The physical con- straints that determine so much of the geometry of real-world buildings simply don’t apply to virtual structures. Video game levels also serve different needs than real-world buildings. A real-world building could be designed to be a comforting place to sleep, or an efficient place to work, or a safe place to take refuge in, but it prob- ably won’t be designed to showcase a series of combat encounters or jump- ing challenges. Real-world spaces often have poor gameplay flow. They’re too open and interconnected, with too many unlocked doors and unclut- tered hallways and too many routes you can take to arrive at the same destination. And, at the same time, they’re too closed off and fragmented, with multiple dead ends and bits of dead space where nothing interesting happens. (I first discovered this back in the late 1990s when the original Rainbow Six team made a model of the Red Storm offices as an Easter Egg. We thought it would be fun to run around and shoot each other in the actual space where the game was developed. We quickly discovered, however, that a bunch of single-person offices connected by straight hallways to a few wide-open team rooms made for a really boring first-person shooter space. The level never made it past the gray box stage.) So why is knowing about real-world architecture useful for making games? The answer to this question is two-fold. First off, even though video game spaces shouldn’t directly copy real-world spaces, they do need to evoke them. We spend most of our lives living in architected environ- ments, and without even realizing it, we’ve internalized a great many rules for how buildings are supposed to be laid out. We know how big a stan- dard door is, and how doors are typically placed in relation to each other. We know how long hallways typically are, and how steeply stairs usually rise. We know that a dining room feels different from a kitchen and how both of those feel different from a factory floor. There’s a subtle internal logic to real-world buildings that flows from the purposes for which they were designed and the uses to which they are put. And if a building in a game ignores this logic then we find it disturb- ing on a subconscious level. It’s the Uncanny Valley for level design. Game levels may need to deviate from architectural realism to accommodate

## Page 22

### Foreword  ◾  xxi


particular gameplay situations, but if they deviate too much then our sus- 

### pension of disbelief collapses. We no longer feel like we’re playing inside a


real space, but rather a collection of arbitrary textured boxes. (The uncanniness of improperly constructed spaces is sometimes delib- erately used in horror games to put players on edge. Corridors that are unnaturally long, rooms that are unnaturally tall, spaces with too many doors or too fewall of these architectural sins have the accumulated effect of making the player wary and uneasy.) So, one reason to study architecture if you’re going to design games is to give yourself a better understanding of what real buildings look like and how they function. However, the second and more important reason to do it is that architecture gives us a language for talking about how humans perceive, talk about, and interact with space. Real-world buildings are more than merely utilitarian shelters. How a building uses space and how it situates itself within the space of its sur- roundings is also a way of encoding meaning. Climbing up a broad flight of stairs to an imposing bronze door encodes a different meaning than descending along a dark, twisting passage to a rusty iron gate. Different architectural forms set up different expectations as we move through and within them. The constraints that they impose upon our actions and per- ceptions have a powerful material effect upon our understanding of what’s happening around us. This is the primary reason why studying architecture is so useful for game designbecause the semiotics of space are the same whether you’re talking about a real-world building or a virtual one. Game levels may need to be laid out in unrealistic ways to accommodate the flow of their accom- panying gameplay, but they still possess the same capacity to influence the player’s attitudes, emotions, and expectations as real-world buildings, and architecture as a discipline has a much longer history of grappling with these issues than game design does. Human beings have been thinking seriously about how to build meaningful structures for at least 5000 years and probably longer. Game design has only started to grapple with the same question for a few decades. (Of course, games themselves have been around for at least as long as people have been building buildings, and probably longer. But until very recently no one gave much thought to the principles behind designing new ones. New games emerged out of the folk tradition, designed by trial and error and honed through innumerable play sessions. The notion that there are abstract game design principles you can draw on to design a new game

## Page 23

### xxii  ◾  Foreword


from scratch didn’t exist until very, very recently. In contrast, people have 

### been writing books/papyrus scrolls/clay tablets about how to build build-


ings for millennia.) So, if we’re trying to understand how to build our game levels to be both meaningful and comprehensible, it makes a great deal of sense to borrow liberally from the vast body of knowledge that has already been assembled to explain the structure of real-world spaces. This is where  An Architectural Approach to Level Design  really shines. Drawing on thousands of years of architectural knowledge and practice, Chris Totten neatly condenses this wealth of expertise into memorable and useful nuggets for the practicing level designer. He assumes that the reader has no prior knowledge of architectural design, explaining basic concepts like elevation, section and contour with clarity and precision. But he also delves quite deeply into the semiotics of space, devoting entire chapters to how level design can be used to evoke emotions, tell stories, and builds communities. As he navigates this critical landscape, Totten continually grounds abstract theory in concrete practice. Design principles are clearly explained using examples from actual games, and accompanied by cleanly-drawn architectural illustrations. In fact, early in the book, he even provides a brief practicum in how to draw such illustrations yourself. This illuminates another strength of this book. Totten doesn’t just explain how spaces can be used to make meaning; he also lays out a com- prehensive methodology for making it happen. He not only describes the basic steps of producing an architectural concept, but he beautifully spells out the workflow required to translate a raw concept into a playable level. The result is a book that is both theoretically exciting and imminently practical. It not only teaches the reader a wealth of useful architectural knowledge, it also encourages them to think about level design in new and creative ways. Even after having read it through several times myself and teaching it in a classroom setting, I still find myself coming up with new ideas whenever I crack it open. It’s also, I have to say, a book that resonates deeply with my own approach to both level design (in particu- lar) and game design (in general). I’ve long thought that existing design theory tends to focus too much on what the player is doing and too little on what the player is thinking. The play space of a game consists of more than just its accumulated interactions and mechanics. There is simultane- ously a broad country of play that exists entirely in the mind of the player, a landscape of expectation and anticipation and interpretation that is just

## Page 24

### Foreword  ◾  xxiii


as rich and ramified as the moment-to-moment challenges that the game 

### itself poses.  An Architectural Approach to Level Design  directly addresses


the challenges of designing for this internal mental play space. Totten hardly discusses dynamic game mechanics at all. Instead he focuses almost entirely on how the static geometry of a game level can neverthe- less structure engaging and playful experiences. A game level (like a real- world building) doesn’t have to do anything to be playful. Rather it evokes a feeling of playfulness within the mind of any player who actively engages with it. Although Totten doesn’t spell this principle out directly, such an approach to thinking about playfulness represents a radical change in how we think about both play and the design of play.

## Page 25



## Page 26

Acknowledgments ’m frankly blown away to be doing a second edition of this book. I 

### When I was writing the first edition in 2013–2014 I could not have


imagined the positive response it would earn from many in the industry that I would consider heroes. I am humbled to have the support of so many in this project, so I want to first acknowledge everyone who has expressed their support for me and my level design work. Thank you! I have also had the privilege to work closely with a number of people who directly impacted my work and I want to acknowledge them here (sorry if I miss anyone). I thank the staff at AK Peters/CRC Press for allowing me to develop this project for publication, especially Rick Adams and David Fausel (project manager of the first edition) and Jessica Vega, project manager for this new edition and my last book  Level Design: Processes and Experiences . I thank my wonderful reviewers from back in the first edition, Jeff Howard (who also got me in touch with the publisher) and Helen Stuckey, whose direction was of great benefit to the quality of this book. Also thanks to the contributors for this edition, Dr. Umran Ali, Robin-Yann Storm, Melanie Stegman, Jerry Belich, Kelli Dunlap, and Camden Bayer, for offering their insight into their game and level design processes. A special thanks also goes out to Brian Upton for being a supporter of the book since the first edition and for writing the foreword to this edition. Thanks to the organizers of the Game Developers Conference (GDC) for sponsoring an event that allows game developers, writers, teachers, and students to meet and make valuable networking connections, some of which made this book possible. Thanks to the GDC Conference Associate program for being such a wonderful part of my life and allowing me to get to GDC in the first place those many years ago. I certainly would not have had the courage to pursue such a project were it not for the valuable opportunities to discuss the concepts in this xxv

## Page 27

### xxvi  ◾  Acknowledgments


book in several venues beforehand. For this I owe a great deal of grati- 

### tude to Christian Nutt at Gamasutra, who helped get me started in game


criticism. I also thank the organizers of the East Coast Game Conference in Raleigh, North Carolina, and the Digital Games Research Association (DiGRA) for allowing me to speak and properly “playtest” the informa- tion contained here. I had the courage to continue writing about level design thanks to the positivity of several important groups in the level design world. I want to acknowledge The World of Level Design staff for being a great cheerleader for my online design ramblings. Thanks also to the organizers and men- tors of the Level Design Workshop at GDC, especially Joel Burgess, Lisa Brown, Mateusz Piaskiewicz, Jim Brown, Claire Hosking, Blake Rebouche, David Shaver, and Andrew Yoder for all the wonderful level design discus- sion over the past few years. I include Liz England in that list as well, but I wanted to spend an extra sentence also thanking her for her most excellent Twitter bots. Many thanks to my supportive colleagues at Kent State University, especially Dr. Nicole Willey for running our on-campus writing group that helps ease the terror of impending deadlines. Thanks also to Mike Treanor, Josh McCoy, and Benjamin Stokes for your continued support in my research. Thank you to the staff of the Smithsonian American Art Museum, especially Kaylin Lapan, Lauren Kolodkin, and Gloria Kenyon for helping me explore the intersections between games and the arts as well as letting me put on a showcase of game worlds! Thanks to the D.C. chap- ter of the International Game Developers Association (IGDA), especially Trey Reyher and Taro Omiya, who have been wonderful collaborators on many gaming endeavors. Also thanks to my new game development com- munity in Ohio, such as the Cleveland Game Developers and in particular Jarryd Huntley and Matt Perrin: your support has meant a lot while I work on projects like this! I certainly cannot forget the faculty of the Catholic University School of Architecture, who have supported my efforts since I began this journey. Lastly, I thank my parents, without whose guidance I would not have become the person to conceive of a project like this, and my amazing wife, Clara, whose encouragement and support have allowed me to make this book something tangible.

## Page 28

About the Author 

### hristopher  Totten  is  an  Assistant


C 

### Professor in the Modeling, Animation, and


Game Creation program at Kent State University Tuscarawas. He is the founder of Pie for Breakfast Studios, an award-winning Northeast Ohio inde- pendent game company, and has done work as an artist, animator, level designer, and project manager in the game industry. He holds a Master’s Degree in Architecture with a concentration in Digital Media from the Catholic University of America in Washington, D.C. Chris is an executive organizer for the Smithsonian American Art Museum (SAAM) Arcade and lifetime member of the International Game Developers Association (IGDA). Chris has written articles featured on Gamasutra, Game Career Guide, and other publications and is a frequent speaker at game industry conferences such as GDC, GDC China, East Coast Game Conference, GDEX, and others. He is the author of  Game Character Creation in Blender and Unity , released by Wiley Publishing in 2012. He is also the editor of the collected volume,  Level Design: Processes and Experiences . xxvii

## Page 29



## Page 30

Introduction 

### ame designer and theorist Ian Bogost has been quoted as saying


1 G  While many people outside the 

### that game design is a bit of a “black art.”


field underestimate the amount of work, expertise, and personnel required to make video games, many inside the industry are humbled by game design’s staggering complexity. The International Game Developers Association (IGDA) 2008 curriculum framework for game design education is a testa- ment to this complexity. Over twenty-seven pages of its forty-one-page length are devoted to a list of suggested topics to cover in an academic program 

2  3
### In  The Art of Game Design: A Book of Lenses ,  designer


on game design. Jesse Schell highlights nineteen fields from which a successful game designer must draw knowledge. Both documents cite topics including business and economics, programming, art, psychology, and theater performance theory. Clearly, the entirety of modern game design is a daunting beast. Perhaps this is why an important part of the game design process, level design, is only now becoming a topic of serious study. Andrew Rollings and Ernest Adams highlight level design’s difficulty in their book  Andrew Rollings and Ernest Adams on Game Design  by arguing that there is no one 4 

### Jay Wilbur and John Romero have great


standard way to design levels. respect for the level designer’s work, saying “level Design is where the rub- 5 

### and “the level designer is largely responsible for the


ber hits the road” 6 

### implementation of the game play in a title.”


Level design is not only an important part of game development, it is also one of the most exhilarating. Many aspiring game designers get their start by creating their own custom levels, called mods, in toolsets for exist- ing games. This act of creating the environment for a game and then play- ing inside your creation is one of the most empowering parts of video 7 

### games, as both a hobby and a profession. Some games, such as  The Sims ,

8  9
### and  Little Big Planet , even tout their level creation tools on


Mario Maker , their packaging to entice potential buyers. xxix

## Page 31

### xxx  ◾  Introduction


The importance of level design in a game project is exactly why it 

### deserves careful consideration as a subject of both academic and profes-


sional study. This book is such a study. WHAT IS THIS BOOK ABOUT? This is a book about level design. It is also about how to look at designed space, which game levels, environments, and worlds most certainly are. Real-world architecture, urban environments, and gardens are also designed spaces. At some point, a designer (it doesn’t matter which kind; design is mostly universal) sat down to solve a problem that could only be solved by designing an interactive space. This problem could be how to best capture sunlight coming through a window, embody a religious idea, accentuate an important clue to solving a puzzle, or provide the best posi- tion for fragging competitors in an online game. Sometimes these spaces are loved by the people who use them, whether it is a home to raise a fam- ily, a plaza to enjoy a latte and some people-watching, or a city in which to shoot gangsters and jump cars off of piers. Comparing level design and architecture can be very simple. It can also reveal things about both fields that we have not seen before. This book reflects on how both level design and architecture solve problems and cre- ate meaningful experiences for those using them. From these reflections, it provides an architectural approach to level design that emphasizes spa- tial design for maximum user engagement. WHAT CAN WE LEARN FROM ARCHITECTURE? The topic of game and level design blending with the field of architecture 

### is popular in industry discussions, articles, and conference talks. When


people think of integrating architectural thought with game design, they often turn to environmental art styles or references to famous buildings. While these things help create interesting level experiences, they are also the tip of the iceberg in terms of game design’s current relationship with architectural design. Rather than simply turning to architecture as a refer- ence for surface level visual elements, we can study how architects conduct space and occupant movement. We can also look to architecture and the many fields it references for inspiration, to understand spatial planning, organization, and how to manage relationships between a space and its occupants. Many seminal books on game design and many seminal game designers do not base their methodologies for creating experiences in game design

## Page 32

### Introduction  ◾  xxxi


alone. To do so is very difficult and risks limiting the body of knowledge 

### we can learn from. While games have arguably existed as long as mod-


ern humans, video games have only existed for about forty or fifty years. While the current video game design texts have done well in building a critical discourse in that amount of time, there is still much work to be done. The books and designers that do, however, pull from other fields often do so to fill in blanks that game design itself cannot fill. How do you create a meaningful succession of rewards to entice players through your game and teach them how to play? Look no further than B.F. Skinner’s theory of 10 

### operant behavior. Need a narrative structure for your hero’s epic quest?


11 

### Try Joseph Campbell’s monomyth of the hero’s journey. What about a


way to make little computer people happy in their little computer environ- 12 ment? Try Christopher Alexander’s  A Pattern Language . This book will do the same for level design, taking architectural prin- ciples and using them as inspiration for video game levels and environ- ments. Like the above examples, level design does not need to stand on its own, but can pull from thousands of years of human knowledge that came before it was a professional field. As designed space, game levels have much to learn from their precursors in real-life architecture, including the development of sight lines, lighting conditions, shade and shadow, explo- ration, orientation, spatial rhythms, and even how to get epic spaces to be even more epicamong other things. BUILDING A BRIDGE BETWEEN GAMES 

### AND ARCHITECTURE


All of this discussion of level design and architecture is well and good, but 

### it is ultimately meaningless unless the spaces that result fit into the context


of a game. A game, as defined by Katie Salen and Eric Zimmerman, is “a system in which players engage in an artificial conflict, defined by rules, 13 

### that results in a quantifiable outcome.”


To design a game, therefore, is to create the system, the rules by which it runs and by which a player interacts with it, the artificial conflict it is meant to embody, and the criteria by which an outcome is reached in the system. This closely reflects Salen and Zimmerman’s definition of  design : “the process by which a designer creates a context to be encountered by a 14 

### participant, from which meaning emerges.”


This definition can mean the design of either games or architecture. In architecture, the architect is the designer, the building or urban space

## Page 33

### xxxii  ◾  Introduction


is the context, the participant is anyone who occupies the space, and the 

### experiences that the occupant has while in the space are the meaning that


emerges from it. However, establishing a parallel is not enough; a true link must be established between the design of games and the design of architecture. Consider Rudolf Kremers’s definition of level design: “This is a basic purpose of level design, to interpret the game rules, and to translate them into a construct (a level) that best facilitates play. Another way of express- 15 

### ing this is by stating that ‘level design is applied game design.’”


Kremers’s definition is a good one that addresses a level’s function as a facilitator of a game’s rules, as expressed by Wilbur and Romero, and as a construct created by a designer. Where Kremers’s definition falters, however, is in the expression of the level as a medium for creating game- play  and  for using spatial design principles to facilitate meaningful user experiences. These experiences can be created through cognitive interac- tions with the player or through emotional meansall executed through spatial methods that will be discussed in later chapters. A better definition for the purposes of this book would be: “Level design is the thoughtful execution of game play  into game space  for players to dwell in.” The best level designers do not only take the contents of a game’s ruleset and embody them in an interactive space. They also thoughtfully employ spatial articulations that enhance a player’s journey through that space. These articulations give previews of what’s to come, allow players to ori- ent themselves in the environment, provide narrative clues without the need for overt storytelling methods such as cutscenes, and entice further exploration. Such spaces are gamespacesspaces that both embody gameplay and facilitate the player’s journey through it, allowing him or her to better experience the game’s mechanics. These spaces do so in such a way that players spend more time having fun and less time figuring out how to use the space. As a field that has perfected these kinds of spatial experiences over thousands of years, architecture is the perfect precedent to teach us how to create better gamespaces. WHAT THIS BOOK WILL TEACH YOU This book explores architectural techniques and theories for level design- 

### ers to use in their own work. The utilized approach connects architecture


and level design in different ways that address the practical elements of how designers construct space and the experiential elements of how and

## Page 34

### Introduction  ◾  xxxiii


why humans interact with this space. Throughout the book, you will learn the skills listed below. Spatial Layout Learning how to create a spatial sequence is paramount to the study of 

### architectural design. Over centuries of work, the field of architecture


has developed methodologies for going from design idea to constructed building. These methods include sketching and modeling crude forms to generate a building idea. They also include more sophisticated render- ings of buildings through plan, section, elevation, perspective, and even modern 3D visualization techniques. While this book avoids exploring the nuances of drafting, these techniques will be used to illustrate how to get both macro and micro views of your gamespaces for the sake of event layout and pacing. Beyond the types of media used to plan buildings, the book also explores how architects deal with materials not just from a structural standpoint, but also from an aesthetic one. While level designers deal with materials primarily on a visual level, the practical concerns of material use can be very useful for level designers. For example, many newer level designers wonder how to make the box-shaped spaces inherent to many level editors seem less boxy. They also wonder how to make their realistically textured surfaces feel more like the real-world materials they are conveying in the eyes of players. Understanding how architects use these materials will help create better gamespaces. Evoking Emotion through Gamespaces If using spatial layout techniques is how we create contexts for users to 

### inhabit, then the emotions these contexts create are what give these con-


texts life. Many buildings in the architectural canon are there because they evoke some greater idea or emotion from occupants. The same can be said of great game levels. Using the arrangements of space as a jump- ing off point, this book will explore how these arrangements respond to emotional factors of game players. One way in which game designers and architects are inherently differ- ent is in the functions of their spaces. While architects typically design for pure function or for the embodiment of positive emotions, game design- ers are free to utilize negative emotions such as anger, aggression, or fear. Architects have developed a set of rules not only for what to do in design, but also what not to do. Game designers can look to both sets of rules for

## Page 35

### xxxiv  ◾  Introduction


inspiration, arranging the “what to do” spaces among the “what not to do” spaces to create an emotionally exhilarating sequence of gameplay. Creating Better Levels through Architectural Theory Rollings and Adams are correct in saying that there is no one way to design 

### levels. For example, a common level design technique such as  graybox-


ing , which is discussed throughout the book, can mean different things to different designers. On the other hand, there are common truths to spatial arrangement that transcend concerns about software techniques. By studying spatial arrangement techniques utilized in great architecture and the kinds of experiences these create, level designers will be able to create similar experiences in their own work regardless of the tools they are using. The effect that level design has on games is profound. As Kremers points 16 

### out, “Bad level design can ruin a good game.” In current level design


practice, playtestingevaluating a level by having people play it many times to test for experiential and technical functionalityis the standard way of ensuring that levels are good. Utilizing architectural principles of spatial design in addition to playtesting can do two things to make this process easier. The first is allowing designers to utilize historically success- ful spatial sequences at the outset of design rather than having them only reach success through experimentation or by copying previous games. Second, having a knowledge of architectural design can give level design- ers a broader vocabulary with which to create gamespaces. As is common in many branches of design, level designers may be aware of many success- ful spatial layouts through their experiences in the field or through play- ing games. However, gaining a vocabulary for these layouts transforms them from vaguely understood secrets to concrete tools that can be used over and over again to great effect. WHAT THIS BOOK WILL NOT TEACH YOU While this book attempts to offer a broad exploration of design concepts 

### that can enrich level design, there is also a lot of information that is outside


of its scope. Some of these topics are addressed here to quell any confusion over the material in this book. Environment Art Many game designers confuse level design with the field of environment 

### art. While both contribute to one final finished game level, we will treat

## Page 36

### Introduction  ◾  xxxv


these as two distinct disciplines for the purposes of this book. Level design 

### is concerned with the sequence of spaces in a game level and how they cre-


ate a better gameplay experience for users. Environment art, on the other hand, is the creation of art assets (3D models, 2D sprites, tiles, or textures) that create the look of a game environment. Neither is more or less impor- tant than the other, as good environment art will enliven the sequence of spaces that a level designer creates and often give it a context within the game’s narrative. Likewise, a good level can utilize environment art assets as part of its system of visual communicationcommunicating to the player through the repetition of specific assets that come to mean things within the context of a game. While this book explores how to best use environment art to commu- nicate to players, it does not cover how to create 3D models or 2D textures, sprites, or tiles in art asset creation programs such as 3D Studio Max, Maya, Blender, or Photoshop. There are, however, many other great books on these topics, which you should explore if you are interested in creating environment art in these programs. CAD Software This book will also not teach you how to utilize computer-aided design 

### (CAD) or building information modeling (BIM) software. As with art


asset creation software, teaching these software packages is outside the scope of the book. As for the use of this software to level designers, CAD is discussed in Chapter 2, “Drawing for Level Designers,” as a potential tool for level design, though for different reasons than how architects use it. BIM, on the other hand, is of little use to level designers, as it is much more tightly con- nected to the construction management functions of real-world architec- ture. BIM programs such as Revit or ArchiCAD allow designers to create drawings of buildings using premade elementsdoors, windows, struc- tural elements, etc.and store construction information in each specific element that can be used for ordering materials and directing contractors. Game Engines In most applications, level design occurs within programs, known as 

### game engines, that are used to create video games. Modern game engines


provide a framework for rendering assets on-screen, responding to player input, facilitating artificial intelligence (AI) interactions, and simulating real-world physics, among other things. In the industry, many different

## Page 37

### xxxvi  ◾  Introduction


game engines exist, with some studios building their own for internal use. 

### While there are popular ones, there is no universally agreed-upon indus-


try standard as with other types of software. This book describes a selection of engines that are popular at the time of its writing, but it avoids providing in-depth software tutorials for using these engines. This is done for two reasons: one is the aforementioned lack of an industry standard. If this book contained tutorials in the Unity engine, for example, it would be a “Unity book,” rather than one approach- able for users of Game Maker or the Unreal Engine. Engines come and go as technology advances, so it is hoped that readers can get more evergreen knowledge from this book even when today’s engines are historic foot- notes. As with environment art, a wide selection of books that teach the use of these game engines is available that interested readers can explore. UPDATES FOR THE SECOND EDITION Hello from the future! Or rather ...  several years after I wrote parts of 

### this introduction. What you are holding in your hand is the second


edition of  An Architectural Approach to Level Design . In the years since the first edition’s publication, the area of level design writing and criti- cism has progressed by leaps and bounds thanks to some really excel- lent people in the game industry. I have also grown as a designer and continue to find new things to talk about as I make more and more levels. For anyone looking at this second edition and wondering what is different from the first, I wanted to take some time to cover the updates I have made to the book. New and expanded content : First and foremost, the book has expanded 

### to include two entirely new chapters on designing tutorial levels and pro-


cedural generation systems. In these sections, you will find information for level designers on how to design for these challenging and nuanced areas of games. Along with these come deeper dives into areas of archi- tectural theory relevant to these topics such as approaches, overviews, and pattern languages. Another major addition are the contribution sections from industry professionals representing areas from big studio game development (or “triple-A”) to indies and academics. In this book, I talk a lot about my own experiences as a level designer and games I have worked on, but level design is not something one designer can define alone. With this in mind, I have worked with level designers to bring their techniques into this book so readers can learn from a variety of sources.

## Page 38

### Introduction  ◾  xxxvii


Lastly, I have revisited several chapters from the first edition to clarify 

### their language and update them with new techniques that I have been


using in recent years. What was previously the second chapter (“Tools and Techniques for Level Design”) is now two separate chapters, “Drawing for Level Designers” and “Level Design Workflows.” This allowed me to expand the techniques found in each to provide even more useful informa- tion to readers. I have also reconfigured several other chapters to include new topics and principles. Updated references : An inherent challenge of writing about the games 

### industry is that what is “current” can change pretty rapidly. This is very


different from architecture, where famous buildings are referenced well beyond their dates of occupancy. I have tried to take a blended approach with this: there are games that I have played in the time between the first and second editions that I know should be referenced to keep the work current. However, I am also a big believer in the staying power of great level design, so you will find many old favorites still mentioned in the text. I have tried to add references to more recent games in addition to old stan- dards, rather than instead of them, so readers can experience the spatial concepts in a variety of games. In the years since the first edition, there has also been a lot of activ- ity in level design writing, both in professional contexts from more fan- accessible sources (YouTube videos, games journalism, blogs, etc.) I have found some of these ideas, like Mark Brown’s diagramming method from his “Boss Keys” YouTube series, particularly earth-shattering. In this new edition, I have documented my findings from applying other designers’ concepts in my own work. Readers looking for a place to find great level design criticism should keep an eye on the “works cited” section of each chapter as I’ve tried to update them with the newest resources. Exercises : I have been very thankful and humbled to have level design 

### instructors approach me to say that they have used the first edition of this


book in their classrooms. Professional developers have also sent me games they made to practice concepts from the book, which is absolutely mind- blowing. With that in mind, I have added exercises to each chapter. These exercises suggest ways to integrate techniques listed in the book such as the diagramming methods, design principles, and others into actual class- room assignments or self-directed practice sessions. As a teacher myself, I have written these as more general “design prompts” rather than prescriptive tutorials so as to not interfere with anyone’s teaching methods. In this way, users can try these exercises in

## Page 39

### xxxviii  ◾  Introduction


software or tools that work for them: 2D, 3D, sketchbooks, writing, and so 

### forth. Keeping the exercises away from specific software also addresses the


desire for the book to remain evergreen long after the current selection of software tools is gone. WHO SHOULD READ THIS BOOK This book looks at level design through the lens of architectural and spa- 

### tial experience theory. While matters relevant to game art are discussed, it


is not a book on environmental modeling or how to create 3D game assets. If you have not yet bought this book and are perhaps reading it in a book- store, then you may want to see if you fit into one of the following groups: The level designer who wants to understand architecture better and bring 

### elements of it into his or her work.  Many discussions of game levels


and architecture focus on environment art creation, with statements of how “cool” certain architectural styles or layouts would look in the art for a game. This book brings level designers into the fray by dis- cussing spatial concepts that have bearing on the layout and arrange- ment of gamespaces relevant to their gameplay goals. It also features advice from industry veterans who have spent time building game levels and worlds, or who have contributed to the field in other ways. The environment artist seeking to better communicate with players 

### through his or her work.  The environment artist is not forgotten in


this text. Visual communication with players involves the graphics, colors, forms, and textures that constitute a game’s environmen- tal art assets. Throughout the book, methodologies for utilizing a game’s artistic presentation together with its spatial gameplay design are proposed for creating memorable player experiences. Teachers and students studying level design.  This book approaches level 

### design from a point of view that synthesizes several bodies of knowl-


edge into one source and employs them through case studies. With the advent of the game design degree, a danger facing the industry is the loss of the eclectic experiences of designers who come from other backgrounds to join the gaming industry. By viewing an important element of game creation, level design, through topics relevant to architecture, this book gives teachers and students in game design programs a broad landscape to pull from. Students especially can look to designer interviews to gain insight into the process from

## Page 40

### Introduction  ◾  xxxix


industry veterans. The book also includes exercises designed to spur deep analysis and discussion. Architects.  While this book mainly focuses on the practice of level 

### design as educated by architectural principles, it is also written to


enliven architectural design through the implementation of game design methodologies. This book recommends an iterative workflow focused around playtesting and audience interaction in interactive spatial simulations. Many architects today find themselves frustrated by the confines of 2D space and the guesswork that comes with try- ing to create meaningful spatial experiences with plan, elevation, and section drawings. This book discusses space and architecture as an interactive medium dependent on user input, much as it was throughout history. Overall, if you have an interest in game design, level design, or architecture, this book will provide a focused and practical approach to level design that cannot be found elsewhere. Whether you are a pro- fessional level designer, artist, or teacher looking for another perspec- tive on your craft; a game design student looking for input from other industries; or an architect trying to learn what all these interactive technologies can do for your own industry, this book has something for you. As games approach that murky and difficult-to-define status known as art, they should be studied in the light of other fields that create meaningful user experiences or even as brave new examples for the established canon. HOW TO USE THIS BOOK This book is separated into a variety of topics on experiential concepts in 

### architectural and video game level design. These concepts are approached


in a general manner rather than focusing on specific game types or genres. For example, there are no chapters with names such as “Sight Lines for First-Person Shooters,” but rather ones on spatial design elements that can be applied to many game types. This was done purposefully so that the techniques are explored in a less prescriptive manner, and so that design- ers can implement them in any way they choose. While the subject of each chapter can be understood without read- ing the chapters that came before, each portion of the book builds on the knowledge from previous sections. As such, it is recommended that

## Page 41

### xl  ◾  Introduction


readers read chapters in order to avoid confusion when a chapter refers to information given in one preceding it. This book has exercises for designers who wish to practice the con- cepts in the book or teachers and students who wish to use the book in their classroom. These exercises are meant to be approached as design and analysis prompts rather than tutorials. The goal of these is for designers to integrate these prompts into their processes (or pedagogy in the case of teachers) as seamlessly as possible. In them you will find writing prompts (appropriate for design journals), drawing exercises (useful if you keep a sketchbook), paper prototyping exercises, game-testing exercises, and digital exercises (suitable for any game engine). HARDWARE AND SOFTWARE REQUIREMENTS This book practices some software agnosticism by not making tutori- 

### als in a certain application a requirement. However, readers may wish to


practice the level design methods in one of several popular game engines. Many of the most widely used game engines for both independent and commercial game development offer free versions, often for non-commer- cial use. Check their websites to find out the exact terms of how they may be licensed. Here are a few links to websites where you can learn about acquiring free game engine software: Unity 3D: www.Unity3D.com Unreal Engine: www.unrealengine.com Source SDK: https://developer.valvesoftware.com/wiki/SDK_Installation Game Maker: http://www.yoyogames.com Construct: https://www.scirra.com/construct2 The hardware specifications for each of these tools can be found on the following pages: Unity hardware specs: https://unity3d.com/unity/system-requirements Unreal hardware specs: https://wiki.unrealengine.com/Recommended_ Hardware Source SDK hardware specs: Source SDK shares the same system requirements as any game that it comes with.

## Page 42

### Introduction  ◾  xli


Game maker requirements: http://www.yoyogames.com/get 

### Construct  system  requirements:  https://www.scirra.com/manual/6/


system-requirements You may want to download some other tools for creating architectural map drawings, and 2D or 3D art assets: Blender 3D (free 3D art and animation program): www.blender.org GIMP (free 2D art program): www.gimp.org Draftsight (free CAD software): http://www.3ds.com/products/-draft sight/overview/ WHAT’S INSIDE THIS BOOK This book explores an architectural approach to level design through a 

### variety of topics on spatial design. Each topic is accompanied by stud-


ies of both game level and real worldbuilding cases. Through these stud- ies, the book proposes spatial design principles for game levels in 2D, 3D, and multiplayer applications. Each chapter is also accompanied by a level design exercise so users can practice what they’ve learned. The chapters and the topics they cover are as follows. Chapter 1, “A Brief History of Architecture and Level Design” This chapter gives a brief overview of the architectural history that is relevant 

### throughout the rest of the book. This includes a listing of styles and tech-


niques from prehistory through Postmodernism. This chapter also discusses several milestones in how the spaces of games evolved from single-screen games with limited movement into the sprawling 3D worlds of current games. Industry Perspective: Dr. Umran Ali This contribution features Dr. Umran Ali, Senior Lecturer at the University 

### of Salford, describing his research project called  Virtual Landscapes . In


this groundbreaking project, he observed the development and trends of game environments that simulate natural landscapes from their infancy in the early days of game consoles to today. Chapter 2, “Drawing for Level Designers” This chapter further explores our definition of level design and provides 

### an overview of some useful drawing and diagramming techniques for

## Page 43

### xlii  ◾  Introduction


level designers. It also covers digital tools that designers can use to plan 

### their game environments including industry standard ones and ones from


architecture. Industry Perspective: Robin-Yann Storm In this contribution, Guerrilla Games Tool Designer Robin-Yann Storm 

### describes the qualities of a good toolset that will help level designers do


their work efficiently. He describes how different features affect a level designer’s workflow and what designers should expect when using these features. Chapter 3, “Level Design Workflows” This chapter approaches level design from a project management stand- 

### point, describing how designers can formalize their processes in stages


to go from concept to creation. It describes how level designers develop mechanics over the course of several levels to create satisfying difficulty curves. It also describes how designers create game worlds that are easily read by players, which will be a theme throughout the rest of the book. Chapter 4, “Basic Gamespaces” This chapter teaches lessons on architectural spatial arrangement, start- 

### ing from basic principles and then applying these principles to several


famous types of gamespaces, such as linear and sandbox spaces. It then analyzes spaces in famous games to discover spatial types that can be used among a variety of games. Lastly, it discusses how game cameras accen- tuate level spaces in games based on their positioning in relation to the player character. Industry Perspective: Jerry Belich In this contribution, experimental game and experience designer Jerry 

### Belich showcases his games that blend digital and electronic technologies


and real-world spaces and objects. Not only does his process include plan- ning games based on mechanics, but also within the metrics of things that players can directly interact with. Chapter 5, “Communicating through Environment Art” Chapter 5 moves beyond overviews of how spaces are used in games and 

### investigates how creating repeatable architectural forms allows design-


ers to communicate with players. Such techniques are demonstrated

## Page 44

### Introduction  ◾  xliii


as methods for changing player behaviors and teaching players game 

### mechanics through subtle in-level tutorials. They are also discussed as


methods for helping players retain and develop their knowledge of how to play through a game through level design. Industry Perspective: Interview with Greg Grimsby In this interview, George Mason University Assistant Professor and four- 

### teen-year game industry veteran Greg Grimsby describes his influences,


his processes for environmental design, and how fine art inspires him. He offers his insight from his time as an art director on games like  Dark Age of Camelot ,  Ultima Forever , and  Warhammer Online: Age of Reckoning . Chapter 6, “Building Exciting Levels with Dangerous Architecture” This chapter introduces spatial arrangements and techniques that allow 

### designers to evoke emotions connected with human survival instincts


and contrasting elements. It shows how arrangements of specifically sized spaces entice players to move along paths. It also shows techniques for using lighting to engage curiosity or fear responses. Industry Perspective: Camden Bayer In this contribution, Arkane Studios Level Architect Camden Bayer 

### describes the day-to-day work of a level designer and the benefits of having


a shared language in the industry. He describes how playtesting, paying careful attention to the needs of players, and doing usability research has helped him refine his maps. Chapter 7, “Enticing Players with Rewarding Spaces” Chapter 7 utilizes psychological theories popular with game designers to 

### discover how game levels can reward players. It explores the architectural


principle of denial to show how spaces and sight lines can be used to make levels that entice players to move through them. Chapter 8, “Level 11: The Tutorial Level” This chapter encourages designers to take a step back and focus special 

### design attention on the first levels of games. Utilizing concepts from the


preceding chapters, this chapter explores how game levels teach players how to play a game. It also describes the building blocks of building excit- ing and non-intrusive tutorial content with architectural approaches, effective spatial communication, and effectively utilizing game assets. It

## Page 45

### xliv  ◾  Introduction


also describes how several educational games teach in their levels so level designers can learn how to turn lesson plans into gameplay. Industry Perspective: Melanie Stegman In this contribution, Molecular Jig founder Melanie Stegman provides a detailed project report from the development of her game  Immune Defense . This report shows her process of determining how, over the course of sev- eral levels, her game should model processes from molecular biology to best teach players about how cells defend the body. Chapter 9, “Storytelling in Gamespaces” This chapter addresses narrative elements of games and explores the dif- 

### ferent ways that built spaces can tell or facilitate stories. It discusses how


changes in materials and environment art can assist the storytelling pro- cess. It also explores how storytelling opportunities can be rewards for passing through difficult gameplay sequences. Industry Perspective: Kelli Dunlap In this contribution, psychologist and game designer Kelli Dunlap, PsyD 

### analyzes the ways that levels can develop psychologically complex game


characters. She describes the choices the player can make about characters in levels from the  Halo  series. This contribution goes beyond environment art storytelling and into the realm of interactive and moral character- building through interactivity. Chapter 10, “Possibility Spaces and Worldbuilding” This chapter discusses how game levels can be built to accommodate dif- 

### ferent player styles and create robust worlds with many play choices. It


discusses how some gamespaces expand based on the abilities players have and that they acquire during gameplay. It also shows how some architects and game designers provide visual overviews of the spaces they create, and how ancient practices of Japanese garden design can inform the designs of game worlds. Chapter 11, “Working with Procedurally Generated Levels” This chapter outlines approaches for level designers to work with systems 

### that generate levels while still maintaining the human-centric element of


handmade levels. It describes the types of procedural generation systems used for level design. It then describes architectural theory for designing

## Page 46

### Introduction  ◾  xlv


chunks of space that can be mixed and matched. The chapter then shows 

### case studies from several games that blend procedural systems with hand-


made design. Industry Perspective: Interview with Chris Pruett In this interview, Oculus VR Head of 3rd Party Publishing and Head Task 

### Master of Robot Invader Chris Pruett describes the levels that inspire him


and works outside of games that he finds impactful. He also describes his process for designing and testing levels for several different styles of games from platformers to adventure games. Chapter 12, “Influencing Social Interaction with Level Design” Chapter 12 explores how urban designers arrange buildings of different use types to facilitate social interaction and unforeseen in-game events. These studies can influence quest structure in single-player games, or even how players interact in massively multiplayer online (MMO) games. Chapter 13, “Sound, Music, and Rhythm in Level Design” Chapter 13 addresses an often overlooked part of spatial design in games: 

### sound design. It explores how architects have used acoustic design to cre-


ate different spatial experiences and how rhythms in space and sound can drive gameplay. It also explores how sound can enhance many of the spa- tial types found elsewhere in the book. ENDNOTES 1.  Fullerton, Tracy, Christopher Swain, and Steven Hoffman.  Game Design Workshop: A Playcentric Approach to Creating Innovative Games . 2nd ed. Amsterdam: Elsevier Morgan Kaufmann, 2008. 2.  Gold, Susan.  IGDA Curriculum Framework: The Study of Games and Game Development . PDF file, version 3.2 Beta. February 2008. http://www.igda. org/wiki/images/e/ee/Igda2008cf.pdf. 3.  Schell, Jesse.  The Art of Game Design: A Book of Lenses . Amsterdam: Elsevier/Morgan Kaufmann, 2008. 4.  Rollings, Andrew, and Ernest Adams.  Andrew Rollings and Ernest Adams on Game Design . Indianapolis, IN: New Riders, 2003. 5.  Saltzman, Marc.  Game Design: Secrets of the Sages . Indianapolis, IN: Macmillan Digital, 1999. 6.  Shahrani, Sam.  Educational Feature: A History and Analysis of Level Design 

### in 3D Computer Games—Pt. 1 . Gamasutra. http://www.gamasutra.com/


view/feature/131083/educational_feature_a_history_and_.php  (accessed October 20, 2012).

## Page 47

### xlvi  ◾  Introduction


7.  The Sims. Maxis (developer), Electronic Arts (publisher), February 4, 2000. PC game. 8.  Mario Maker. Nintendo (developer and publisher), September 10, 2015. Nintendo Wii U game. 9.  Little Big Planet. Media Molecule (developer), Sony Computer Entertainment (publisher), October 2008. Playstation 3 video game. 10.  Salen,  Katie,  and  Eric  Zimmerman.  Rules  of  Play:  Game  Design Fundamentals . Cambridge, MA: MIT Press, 2003, p. 345. 11.  Campbell, Joseph.  The Hero with a Thousand Faces . 2nd ed. Princeton, NJ: Princeton University Press, 1968. 12.  Donovan, Tristan.  Replay: The History of Video Games . East Sussex, 

### England: Yellow Ant, 2010. Will Wright was famously inspired to create  The


Sims  after reading  A Pattern Language  by Christopher Alexander. The game was originally about building architectural spaces according to Alexander’s language of architectural patterns.  The Sims  characters’ original purpose was to score the player’s use of the patterns. 13.  Salen,  Katie,  and  Eric  Zimmerman.  Rules  of  Play:  Game  Design Fundamentals . Cambridge, MA: MIT Press, 2003, p. 80. 14.  Salen,  Katie,  and  Eric  Zimmerman.  Rules  of  Play:  Game  Design Fundamentals . Cambridge, MA: MIT Press, 2003, p. 41. 15.  Kremers, Rudolf.  Level Design: Concept, Theory, and Practice . Wellesley, MA: A.K. Peters, 2009, p. 18. 16.  Kremers, Rudolf.  Level Design: Concept, Theory, and Practice . Wellesley, MA: A.K. Peters, 2009, p. 3.

## Page 48

C h a p t e r  1 A Brief History of 

### Architecture and


Level Design lot of game designers think of architecture as a thing to study A  when they need historic precedents to enhance their environment art 

### or create an epic backdrop for their game. Using architectural forms that


the player recognizes but may associate with exotic places is one way to enhance the experience of your game. These experiences enhance a game’s ability to bring players into its make-believe world and provide the feel- ing that the player’s actions have some sort of effect on important events. These can be good uses for architectural history, but by truly understand- ing humanity’s built past, we can learn more exactly how space affects interactivity. Looking to historic precedents can have other important effects for designers, too. Beyond being inspirations for backdrops, historical spaces have many lessons to teach about how space is composed. While form has always been a consideration of architects, historic buildings were also built with a great focus on the experience they created for visitors. As such, level designers looking to architecture for insight into their own work can learn a great deal about composing sight lines, telling stories with levels, inviting social play, and many other spatial design principles by carefully studying historic structures. 1

## Page 49

### 2  ◾  An Architectural Approach to Level Design


This chapter provides a brief overview of architectural history with a 

### focus on the buildings that are important for our explorations in the rest


of the book. We look at the evolution of gamespaces to discover how game rules and technological limitations have created interesting design oppor- tunities. Finally, we explore some guidelines for visual analysis that will influence how we play gamespaces. What you will learn in this chapter: Breaking the rules of level design An experiential history of architecture The history of gamespaces Ways of seeing for level design BREAKING THE RULES OF LEVEL DESIGN Let us get something out of the way early on: is level design a field that one 

### enters by learning software or by learning theory? As a follow-up ques-


tion: is level design a field that should be advanced through new software or new theory? These are not really easy questions to answer and for most developers, what is most important might change over time. On one hand, the limitations of the platform upon which a given game is developed or the workflow that a game engine supports have a great impact on how a designer works. For many designers, understanding how technol- ogy impacts design brings a wealth of intrigue. Digital game development has traditionally been seen as a discipline related to science, technology, engineering, and math (STEM), so the idea that technology is core to under- standing game worlds is not far off from many designers’ feelings. You hear lots of industry veterans speak poorly of “game studies” as a discipline because it often fails to include the practical use of game-making software. For designers in a tools-first camp, level design is something one studies by opening an engine like Unreal and mastering the building process. Theory-focused designers, on the other hand, see technology as a means to an end, a tool for creating experiences that are otherwise described by intangible ideas like spatial psychology and game feel. For these design- ers, studying other games is important: learning from the successes and failures of previous designs is a way to build new and better ones. This allows them to decode the more mysterious elements of game experiences through theoretical guidelines rather than technology “best practices.”

## Page 50

### A Brief History of Architecture and Level Design  ◾  3


Among the many facets of game design, level design is one of the most 

### difficult to isolate as having one correct methodology. The tools and tech-


niques that build a great level for one game do not always translate into other games or genres. Saying that all designers should focus on technol- ogy or theory fails in a lot of ways: there are lots of games designed around theoretical goals that ignore basic playability or bug-fixing. There are also wonderful showcases for technology, such as recreating a real-world building or city in a game engine, that fail because these places don’t make very interesting game levels. Level design cannot be learned in the same way something like 3D game art can. With few exceptions, there is an accepted way of creating 3D art, just as there are accepted ways of creating game sound or specific classes one would use for defining inputs when scripting in a game engine. Software-based tutorials for level design typically utilize engines geared toward specific game types (often first-person shooters). While these dem- onstrate software-specific methods that get developers started with a tool, they often do little to teach developers what makes spaces memorable. Confused yet? That’s okay: at the time of this writing, level design is undergoing an identity crisis that game design has been undergoing for several decades. Prior to 2003, books on the general design of games and game design theory were rare, and many books on “game design” were actually software or coding manuals. One of the earliest examples of a 1 

### book devoted to game design theory is  The Art of Computer Game Design


by Chris Crawford. Written in 1984, it was one of the few game design theory books for many years. In the 2000s, publications such as  Andrew 2 

### Rollings and Ernest Adams on Game Design ,  Rules of Play: Game Design

3  4  5
### Fundamentals ,  The Art of Game Design , and  Game Design Workshop


advanced the field from purely computational to an aesthetic practice. These books take a much more generalist approach to game design, show- ing readers how to conceive of games through their mechanical, narrative, or experiential elements. Ian Schreiber and Brenda Brathwaite’s  Challenges 6 

### for Game Designers has readers actively deconstruct games to learn new


things about them. In this way, games become modular systems that can be shaped by designers rather than the result of specific how-to manuals. Many of these books draw from fields outside of game design to influ- ence their material. Salen and Zimmerman discuss not only the design of famous games, but also the work of psychologists, designers, architects, and others to synthesize how one might create games.

## Page 51

### 4  ◾  An Architectural Approach to Level Design


We need to similarly break the rules of how we understand level design 

### if we are to advance it. While it can be beneficial to explore the design


of levels for games of specific genres, there is also a lot of room for gen- eralization. For example, if we were to say, “In first-person shooters, it is tactically advantageous to have a high position to shoot from,” this could be a good criterion for designing deathmatch maps: having lots of snip- ing positions and crisscrossing catwalks. If we remove the specificity to first-person shooters, however, we can say, “It is advantageous to have a high position when in a game level.” This can then be applied to stealth games, fighting games, platformers, first-person shooters, and many oth- ers (Figure 1.1). Understanding this, a developer working in a specific engine can apply this spatial knowledge in whatever way works best for it: creating a tall BSP Brush geometry in Unreal, importing a tall level object into Unity, building a tall structure with tiles in Game Maker, etc. This is how I approach level design in this book: as information that designers can utilize in the context of their software of choice. In this way, architectural history has a lot to show us about how gamespaces can be constructed. Some of the most famous pieces of archi- tecture are the result of a designer taking an intangible idea and embody- ing it in a structure that has to support occupants, withstand the elements, and not fall down. Architecture is a field built on  practical theory  that can provide level designers with insight in both how humans perceive space, and cool ways to construct space. If we understand level design as the application of a broad set of general spatial theories applied to playable games, we can use experientially rich architecturethat means to elicit FIGURE 1.1  Height generally offers strategic advantages to players in game lev- els. This is a guideline that can apply to many game genres and types.

## Page 52

### A Brief History of Architecture and Level Design  ◾  5


an emotional response from occupants or affect their behavior in some wayas a precedent for our own level designs. AN EXPERIENTIAL HISTORY OF ARCHITECTURE There are many ways to understand the history of architecture. Some writ- 

### ers focus on a history of structural components: post-and-lintel construc-


tion, column types, arches, domes, vaults, etc. (Figure 1.2). Others focus on the evolutions of styles over time. Some styles have philosophies that impact how one explores works in that style, but often they focus on the formal or sculptural aspects of buildings. Lastly, there is the evolution of architectural experiences. These can be closely related to cultural factors of the times and places in which they were built. They often most closely reflect the ideas of the designers and builders of space. Experientially focused buildings utilize space to create specific experiences or evoke some idea broader than the architecture itself. Understanding these varied outlooks on architectural history can be useful to game and level designers. Having proper structural elements in a level adds to the  structural believability  of a gamespace. If a column does Lintel 

### Post


Doric  Ionic Corinthian Dome Arch Vault FIGURE 1.2  Standard structural elements found in architecture. These can be 

### useful to game designers and environment artists seeking to have believable


architectural components in their game levels.

## Page 53

### 6  ◾  An Architectural Approach to Level Design


not look like it would reasonably support a building in real-life players will 

### notice—breaking player engagement. Knowledge of architectural style


and form also helps art directors create the look of games. Some games utilize fictional architectures inspired by real styles. The  Halo  series, for 7 

### example, often utilizes Gothic-inspired motifs for game levels, such as in


8 Halo 4 ’s  Requiem mission (Figure 1.3). Architectural allusions can be a 

### good way to theme your gamespace or give it a sense of epic otherworldli-


ness. In the case of  Halo , the vertical elements of Forerunner buildings lend to the Forerunner race’s perceived power and mythical presence in the series. Style and form will be an important part of the discussions in this book, as they contain the language through which we communicate with players. It is, however, the experiential elements of architecture that most of this book focuses on. In many ways, level design is about how players utilize space. Level spaces in games are about creating cohesive, engaging experi- ences for players. This is why we focus not on the entirety of architectural historythat is a topic for an entire book, several of which already exist but instead on a selection of architectural pieces that have some important experience to talk about. Some of these pieces will also have structural or formal elements worthy of note, which is discussed later in the book. However, a building’s inclusion in this historic overview is ultimately to serve our own spatial design goals: creating a meaningful and emotionally evocative user experience. FIGURE 1.3  The Gateway structure at the end of  Halo 4 ’s Requiem mission fea- 

### tures Gothic architecture-inspired elements such as tall pointed arches and a reli-


ance on vertical linear elements.

## Page 54

### A Brief History of Architecture and Level Design  ◾  7


Elements of Architecture and Level Design The Roman architect Vitruvius, who lived around 40 BCE, considered  fir- 

### mitas  (firmness),  utilitias  (utility), and  venustas  (delight) to be the vital


9 

### elements of architecture. This book, based on spatial design theory while


addressing practical elements of level construction, utilizes elements simi- lar to those outlined by Vitruvius. Functional Requirements First and foremost, your game must work. This is the  firmitas  of level 

### design. It is for this reason that this book will keep theory discussions


grounded in level construction methods. Chapter 3, for example, dis- cusses practical elements of level design, including overviews of level con- struction methods for several engines. Later chapters discuss theory with an eye toward how game assets may be used to fulfill experiential goals for level design. Usability Next, gamespaces must be usable. In this way, we should concentrate 

### on how players see gamespace through points of view, game cameras,


and how they navigate levels. This element of level design concentrates on navigation and teaching. As we will see, levels are an opportunity for game designers to have an indirect conversation with players. As such, our game levels should teach players how to use themselves and speak in easily understood language. Delight Lastly, our gamespaces should be rewarding to go through. For this, we 

### must engage the psychological elements of level design and understand


how levels guide players through emotional experiences. Note that I am avoiding the word “fun” here. Many games strive for playful, visceral, and thrilling experiences, but games can also be enormously scary, personal, heartbreaking, funny, and even tragic. For this reason, we will discuss suc- cessful levels as being emotionally resonant: that great art can bum you out, make you think, or produce empathy is what makes it great. By challenging and rewarding players, we offer them opportunities to have agency over the climactic elements of games in ways no other media form can offer. For this, we should strive to create the most engaging experience possible. It is important to note that these experiences are not mutually exclu- sive, nor is any one hierarchically more important than another in level

## Page 55

### 8  ◾  An Architectural Approach to Level Design


design (Figure 1.4). It is also important to understand these elements, as 

### they are the lens through which we will explore our experiential history


of architecture. The Beginnings of Architectural Sight Lines In its earliest form, architecture was simply a means of shelterthe ulti- 

### mate in fulfilling functional requirement. Fitting early humankind’s


migratory lifestyle, early dwellings were in caves or were constructed from temporary, portable materials such as animal skins and poles. As humans became increasingly agricultural, they settled in a single place and their shelters became more hut-like. This occurred about 12,000 years ago, dur- 10 

### ing the Holocene period. Over time, settlements became large cities, one


of the earliest being the biblical Jericho, originally settled in around 8000 BCE in what is now Palestine. With the rise of urban living came the rise of non-hunter/gatherer roles for occupants. Among these were priests and other hierarchically important persons who oversaw the settlement’s links to deities and the afterlife. Concentration on the spiritual elements of one’s life also neces- sitated the construction of buildings for spiritual purposes, especially worship and burial. The architecture of these buildings reacted to sacred elements in the lives of their builders. Western European sites such as the Newgrange passage grave in County Meath, Ireland, and Stonehenge in Functional 

### Usability


Requirements Level Design Delight FIGURE 1.4  A diagram of the three elements of level design and how they cor- respond to one another.

## Page 56

### A Brief History of Architecture and Level Design  ◾  9


Salisbury, England, are examples of this type of architecture. A transom- 

### like opening in the Newgrange grave allows the light of sunrise during


the winter solstice to enter and illuminate the grave’s inner chamber (Figure 1.5). Stonehenge is oriented such that the sunrise during the sum- mer solstice occurs directly over a heel stone at its eastern end. This has led some to conclude that the site was a giant observatory for prehistoric peoples (Figure 1.6). The examples of Newgrange and Stonehenge illus- trate the early acknowledgment of designed sight lines in architecture. In both cases, architectural elements were carefully planned such that they FIGURE 1.5  A sectional diagram of the Newgrange passage grave in County 

### Meath, Ireland (constructed ca. 3100 BCE), showing the transom-like passage


that allows light to enter the inner chamber at specific times of the year. FIGURE 1.6  Stonehenge, located on the Salisbury Plain in England (constructed 

### ca. 2900–1400 BCE), utilizes architectural elements to establish sight lines to


important astrological phenomena.

## Page 57

### 10  ◾  An Architectural Approach to Level Design


were positioned for best observing specific astrological phenomena. Even 

### in these early stages, we can see how designers utilized architectural forms


to direct the attentions of occupants. This will be vital to us as we study user interaction in level design. Architecture as Representation in Ancient Mesopotamia The invention of written language by the Sumerians in 3500 BCE is largely 

### considered the border between prehistoric and historic periods in human


history. The Sumerians were one of several civilizations that began in Mesopotamia, a territory in modern-day Iraq, Iran, Syria, and Turkey considered the cradle of Western civilization. Mesopotamia was home to several peoples, including the Sumerians, Akkadians, Assyrians, and Babylonians. The Sumerians worshipped many deities, and thus greatly influenced the development of temple forms. During the Neo-Sumerian period (ca. 21502000 BCE), they developed the  ziggurat , a temple raised on an artifi- cial mound, often built of kiln-fired brick. The development of the ziggurat is important in the development of architecture as a system of representa- tion. The ziggurat form (Figure 1.7) is said to have fulfilled two functions: elevating temples closer to the gods, and recalling the mountains from which the Sumerians migrated. In this way, the Sumerians were using shapes or ornamentation of buildings to convey a larger idea. Later  Mesopotamian  civilizations,  such  as  the  Babylonians  and Assyrians, would also use architecture as representational forms. The constantly warring Assyrians especially utilized their architecture as a means to convey their power and ferocity. They made great use of the ziggurat form to elevate their palaces above surrounding villages. In Sargon II’s royal city of Korsabad, built in 720 BCE, realistic sculptures FIGURE 1.7  The Ziggurat at Ur (built in the citystate of Ur, modern-day Iraq, 

### ca. 2100 BCE) typifies the ziggurat form. These buildings brought temples closer


to the gods and are said to have been constructed to resemble the mountainous regions from which the Sumerians came. The city of Ur is also notable for having one of the first known board games: the Royal Game of Ur.

## Page 58

### A Brief History of Architecture and Level Design  ◾  11


of animalsbulls, eagles, etc.and of conquering armies warned visitors 

### of the dangers of defying Assyrian power. The spatial layout of the palace


utilized circuitous sequences of rooms for reaching important chambers such as the throne room. This was to confuse and further accentuate the absolute power of the Assyrians (Figure 1.8). The representational systems utilized by Mesopotamian cultures will be useful as we study how to build game worlds and use art and sound assets to set environmental tone. Architecture as Statement in Ancient Egypt Ancient Egyptian civilization began in ca. 3000 BCE with the uniting of 

### Upper and Lower Egypt by Pharaoh King Menes. Egyptian monumental


architecture focused heavily on establishing links between the pharaohs and the gods. It was believed that during life, the pharaohs were mani- festations of the falcon-headed god Horus. Upon death, they were linked with Osiris, lord of the underworld. Both gods were linked with Ra, the sun god. It was for this reason that many Egyptian architectural works utilize the  pyramid  form, either as an entire building or as the tops of obe- lisks (Figure 1.9), as it was believed to establish links between the pharaohs and the sun god. Imhotep, court architect to the pharaoh Djoser, designed one of the first pyramids in 2630 BCE. The building was begun as another traditional Egyptian form, a  mastaba short stone tombbut was elaborated on by Khorsabad ziggurat 

### Winding path to


throne room Khorsabad statue FIGURE 1.8  Sargon II’s palace at Korsabad (built ca. 720 BCE) utilized architec- 

### tural form, sculptural ornament, and disorienting spatial sequences to assert the


dominance of the Assyrians to visitors.

## Page 59

### 12  ◾  An Architectural Approach to Level Design


Pyramid of Djoser Ob elisk 

### Pyramids of Giza


FIGURE 1.9  The pyramid form was used in ancient Egypt to establish links 

### between pharaohs and the sun god Ra. This image of a typical Egyptian obelisk,


the step pyramid of Djoser (built in 2630 BCE), and the Great Pyramids of Giza (built between 2550 and 2460 BCE) demonstrates uses of the form. stacking several mastabas on top of one another. Other notable pyramids 

### include the famous Great Pyramids at Giza, built between 2550 and 2460


BCE for the pharaohs Khufu, Khafre, and Menkaure. The chambers in these pyramids have symbolic associations based on their materials. The physical positioning of chambers has symbolic significance, such as those bored into the bedrock below the pyramids, representing the underworld. Similarly, special materials such as red granite are used to emphasize important spaces such as the king’s chamber in Khufu’s pyramid. The constructions of early Egyptian monuments and tombs, from form to materials, were carefully planned to communicate the importance of their patrons. Later Egyptian works would move away from the pyramid form and toward temple forms with sequential spaces. The mortuary temple of Queen Hatshepsut, built between 1473 and 1458 BCE, utilized a sequence of terraces and colonnades to emphasize depictions of the queen’s life embedded in the walls of the temple. These temples also utilized  hypo- style  halls, spaces with a dense grid of columns holding up a stone roof. Experientially, these halls created the feeling of a vast expanse with dim lighting to make the room feel ethereal (Figure 1.10). Evidence suggests that the Egyptians’ use of such columns, especially those with faceted sides, would later influence Greek column styles. The architectural styles of the Egyptians can likewise influence our own understanding of space. On one hand, they standardized forms such

## Page 60

### A Brief History of Architecture and Level Design  ◾  13


Hypostyle FIGURE 1.10  Hypostyle halls like those found in the mortuary temple of Queen 

### Hatshepsut create the feeling of vast space through rhythmic, closely spaced col-


umns and dim lighting. as the pyramid and the column to create the beginnings of modular archi- 

### tectural language. On the other, they associated ideas with these modular


pieces such that they were universally recognizable within the culture. Spatial and Symbolic Relationships in Greek Architecture In the West, Classical Greek civilization is credited with many advance- ments in art, architecture, philosophy, politics, science, and other fields. It is no wonder then that Greek architecture helps us understand how relationships  between  objects  and  environments  drive  our  experi- ence of space. The Greek philosopher Plato, for example, sought inner beauty through the expression of  form , the perfect embodiment of pro- portional geometries that humans attempt to recreate through art and 11 architecture. Greek architecture emphasized ratios and dimensions to establish forms. The relationships between buildings often occurred on care- fully planned axes or sight lines. During Greece’s Archaic period, ca. 800480 BCE, temple architecture was established following the form of  megarons , rectangular spaces with entrances on the shorter sides so the space was perceived as very long. In Greek temple architecture (Figure 1.11), this established a processional sequence of spaces from the temple’s  pronaos  (entryway) to a  cella  or  naos  (long interior space) where the statue of the deity would reside, and an  opisthodomos  (addi- tional rear room). This period also saw the establishment of what the Roman architect Vitruvius would later call the  orders  of architectural columns:  Doric ,  Ionic , and  Corinthian . These three orders represented the proportions of men (Doric), women (Ionic), and young maidens

## Page 61

### 14  ◾  An Architectural Approach to Level Design


Opisthodomus 

### Naos


Pronaos FIGURE 1.11  Greek temples use a procession of spaces and long rectangular rooms to guide viewers to statues of their gods and goddesses. Doric  Ionic  Corinthian FIGURE 1.12  The three orders of Greek columns. They allowed for the creation 

### of different proportional effects in building construction and form the basic lan-


guage of Greek architecture. (Corinthian) in their forms and ornamentations (Figure 1.12). The use 

### of these columns allows the creation of subtle proportional effects in


temple design. Doric columns, for example, lend a weighty and asser- tive nature to buildings, while Ionic columned buildings “feel” light, as though they were being lifted from the ground. More important than their formal qualities is the fact that these columns are among several elements that founded the Greek  architectural vocabulary . Architectural vocabularies, often referred to as  vernacular , are consis- tent elements utilized throughout the structures of a specific culture or aesthetic. Architectural vocabularies throughout history allow specific

## Page 62

### A Brief History of Architecture and Level Design  ◾  15


formal arrangements to become associated with specific building ideas 

### or uses. Buildings with recognizable forms and vernacular elements are


known as  types . As with the Egyptians, the Greeks’ use of these linguis- tic architectural elements exemplifies how we will develop languages of level forms and art assets to create game worlds. Later Greek public architecture during the Classical period (between 479 and 323 BCE) brings concepts of spatial hierarchies and arrange- ments even more to the forefront. The Athenian Acropolis, built in 479 BCE, utilizes a carefully planned spatial sequence to guide visi- tors around and into its primary buildings, the Temple of Athena Nike, the Propylaea, the Erechtheion, and the Parthenon (Figure 1.13). The approach to the Parthenon seems random, but was a carefully planned sequence of perspectival experiences. First, visitors would see the Acropolis from far away as they approached the hill on which it sat. Next, they would enter the entrance portico of the Acropolis, the Propylaea. This building offered a choice: continue onward to the Acropolis proper or divert slightly to the Temple of Athena Nike. Those who continued to the Acropolis proper would view it from behind a screen of columns, framing the statue of Athena. The Parthenon itself was viewed at a slight Statue of 

### Erechtheion


Athena 

### Propylaea


Parthenon Temple of Athena nike FIGURE 1.13  The plan of the Athenian Acropolis and a simulated sketch view of 

### the approach to it. The designers previewed the visitor’s arrival at the Parthenon


several times in this spatial sequence.

## Page 63

### 16  ◾  An Architectural Approach to Level Design


angle. This was intentional, as designers intended for it to be viewed 

### three-dimensionally by walking around it and seeing it in perspective


rather than seeing it straight on. This also made the  composition  of views more dynamic, as viewing the building straight on would give it a static feel. Visitors of the Erechtheion are likewise reminded of the Parthenon’s dominance of the site, as it utilizes architectural language similar to the larger building and features a porch that offers yet another composed view of the famous building. Later Greek urban architecture, such as the Athenian Agorabuilt in 150 BCEoffered not only similarly planned approaches, but also articu- lations of public and private space through the use of stoa, columned struc- tures used for meetings and commerce (Figure 1.14). People could mingle as they circulated through the large open spaces of the agora, which was on the road to the Acropolis, or stay and linger in the stoa. These dichoto- mies of public/private, motion/pause, and large/intimately sized space will be of great use as we explore how gamespaces influence player actions. FIGURE 1.14  The Athenian Agora offers a mix of public and private spaces. The 

### large, open public spaces are generally used for circulation and travel, while the


covered private spaces lend themselves to meetings and other stationary activities.

