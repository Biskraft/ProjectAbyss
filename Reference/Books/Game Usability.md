## Page 1

### Heuristics for Game Usability 1


Heuristics for Usability in Games 

### White Paper


Noah Schaffer, Certified Usability Assistant (CUA) 

### April 2007

## Page 2

### Heuristics for Game Usability 2


Introduction Usability is basically the study of user-centered design. The most useful definition of 

### usability comes from Jakob Nielsen (1993), “It is important to realize that usability is not


a single, one-dimensional property of a user interface. Usability has multiple components and is traditionally associated with these five usability attributes: learnability, efficiency, memorability, errors, satisfaction” Because electronic games are about enjoyment rather than efficiency, this list of usability attributes can be narrowed to learnability, memorability and satisfaction for electronic games. The author has found that, in games, usability addresses issues in the interface, issues with intuitiveness, and issues with players getting stuck. In usability there’s a history of using heuristic principals, or shortcuts, to find usability problems. This history dates back to Jakob Nielsen’s (1993) use of heuristics in mainframes and continues up to modern heuristics used in areas such as web site design. Though Nielsen’s heuristics have been shown to be effective when applied to game design (Laitinen, 2006), usability heuristics more tailored to games are desirable. Some heuristics have been designed specifically for electronic games. Melissa Federoff (2002) designed one set of 40 heuristic guidelines for games. Heather Desurvire and her collegues (2004) made some developments and put out another set of 43 heuristics for games. These heuristics are a great start, but both of these sets of heuristics are relatively vague and difficult to implement during the design process. For instance, Federoff includes heuristics like “create a great storyline,” and “a good game should be easy to learn but hard to master” (2002). These are useful in reviewing the game postmortem, but hard to implement during the design process. Additionally, examples aren’t provided with either of these sets of heuristics, so they’re less clear to practitioners. Microsoft is the leading pioneer in usability in games. Though Microsoft has focused on usability testing, they do employ some heuristic techniques. In a presentation at the Game Developer Conference (Romero & Lorusso. 2005), some common usability problems were outlined. However, Microsoft has yet to publish a list of heuristics for games.

## Page 3

### Heuristics for Game Usability 3


I began my experience with usability in the field of web design with Human Factors International. As a psychology undergraduate student at the University of Iowa, I worked on usability in cutting-edge cockpit displays at the Operator Performance Laboratory. My graduate program at RPI is focused on human computer interaction (HCI) in video games. In the summer of 2006, I did an internship at Mobile2Win in Mumbai, India. At Mobile2Win, I developed both a protocol for usability testing and the usability heuristics in this document. I feel that these heuristics can be beneficially implemented, so I’m making them available in the form of this white paper. This white paper gives a new set of heuristics in a format that’s relatively easy for game designers to implement. The heuristics are concrete and specific, so it should be clear to game designers how to implement the heuristics. Additionally, each rule is accompanied by at least one example for clarity. It’s worth noting that these heuristics are just another step in the evolution of Usability Heuristics for game design, and that they’ll probably go through more evolution. Also, they will not catch absolutely every Usability issue in every single game, but rather act as one of many filters to catch usability problems. Though there are more complete methods, heuristic evaluation is fast and inexpensive. Speed and cost are both critical to minimize in the industry of electronic games, so heuristic evaluation is a valuable tool. Usability should take 8% to 12% of resources for any design project (Nielsen & Giluz, 2003), and games are no exception. A more complete solution to usability in games would include heuristic evaluation, but also expert evaluation and user testing. Expert evaluation involves usability professionals reviewing games, often using some combination of techniques like personas and cognitive walkthroughs. Though involved, user testing is especially important because it tests the usability of the interface for actual users. See Sauli Laitinen (2005) for more discussion of the merits of usability testing and expert evaluation of games as this kind of complete usability solution.

## Page 4

### Heuristics for Game Usability 4


Heuristics for Usability in Games 

### General


In a broad sense, make your game intuitive for your player. This includes controls, Heads Up Displays (HUDs), path finding, and goals. Minimize flashing. In Lord of the Drinks, the items on the tables flash. The screen basically switches between the two above frames. It’s possible to look at a table when the flashing is off and miss the status of the table. It’s also possible to have a huge amount of stuff flashing on the screen, which is overwhelming.

## Page 5

### Heuristics for Game Usability 5


Avoid large blocks of text. Too much: Better: 

### “Jump along the pizza boxes to take the pizzas across the poop to the delivery boys!


Boxes sometimes sink, and time is short!”

## Page 6

### Heuristics for Game Usability 6


Don’t rely on players’ memory: Don’t use abbreviations or acronyms. In the game Outsourcing, the player is presented with this list of 9 acronyms. Players won’t remember the meaning of all of them. Fortunately, remembering these acronyms isn’t critical for functional game play. Don’t rely on players’ memory: Don’t require the player to count resources like bullets and life. Counterstrike does a very good job of keeping information about resources available. 

### Highlighted above with red circles, information about life, armor (Kevlar), ammunition,


and time are all easy to see at the bottom of the screen. Note that they also don’t obstruct play, because they’re peripheral. Also note that there isn’t much extraneous, unnecessary information.

## Page 7

### Heuristics for Game Usability 7


Don’t rely on players’ memory: Players shouldn’t have to memorize 

### the level design (but it’s arguable there are exceptions)


In Mega Man, this part of the level has 

### blocks that appear and disappear. In order


to progress, players must learn the order in which the blocks appear in the different locations. This is the only way in which players can predict when to jump to which block. This reliance on players’ memory will frustrate many users, though it’s arguable that this is part of the intended challenge. At least be aware of this kind of memory challenge if you use it, and be aware that it will be unpleasant for many users. If you must rely on players’ memory of the level, don’t do it too much.

## Page 8

### Heuristics for Game Usability 8


Graphical User Interface (the persistent displays 

### on the screen, such as life points, score, level,


ammunition, ext) All relevant information should be displayed, such as life points, lives, and ammunition. This is the same example as in the “don’t require players to count resources” rule, 

### because displaying relevant information is the usual way of not requiring players to count


resources. Counterstrike does a very good job of keeping information about resources available. Highlighted with red circles, information about life, armor (Kevlar), ammunition, and time are all easy to see at the bottom of the screen.

## Page 9

### Heuristics for Game Usability 9


Don’t display irrelevant information. Kills, displayed at the top left, is completely irrelevant to game play. Critical information should stand out. Time is down to 2! The player is in his last 

### seconds of play, but he may not realize it


because nothing is drawing attention to the timer. The timer could be larger or in more contrast with the background. But another solution here is to make it stand out more only when time is getting short. Make it turn red and flash, for instance. This can also be done with things like life points, when they get low.

## Page 10

### Heuristics for Game Usability 10


Don’t bury frequently used information. In Counterstrike, players normally buy items at the beginning of every round. This amounts to once every 2 or 3 minutes of gameplay. To buy items, players have to hit the “B” key. This is a relatively buried way of doing something so regular, and consistently causes trouble for new players. A more user-friendly process would be to put players in a different area where players could point to items and click them to buy them before each round.

## Page 11

### Heuristics for Game Usability 11


Menu item names should be intuitive and obvious Which item on the left takes you to the higher-level screen on the right? It could be 

### either Menu or Airport, but it’s not clear. It’s actually Airport, but users often press


Menu. The player should know where they are on the mini-map, if there is one. The mini-map is the long gray rectangle on 

### the right. Which of the dots on the mini


map are you?

## Page 12

### Heuristics for Game Usability 12


Gameplay General It should be clear what’s happening in the game. Players should 

### understand and be able to identify Goals


When the bomb has been planted, the counter-terrorists need to immediately diffuse the 

### bomb and the terrorists need to defend the bomb. By displaying an alert in the middle of


the screen and giving an audio warning “The bomb has been planted,” the new goal is very clear. It should be clear what’s happening in the game. Players should 

### understand and be able to identify failure conditions (How they lose)


Players consistently thought they lost 

### because they’d collided with objects too


many times. But the actual failure condition was that the bullies had caught up. Out of 10 users, none figured out what the failure condition was.

## Page 13

### Heuristics for Game Usability 13


It should be clear what’s happening in the game. Players should understand and be able to identify game elements like the Avatar. Many players reported uncertainty about which character they were controlling. Some where even unsure which team they controlled. Note that the red triangle does help, though the distance from the player being controlled makes it help less. It should be clear what’s happening in the game. Players should understand and be able to identify game elements like the Enemies. The ships in the water don’t stand out 

### enough, so players won’t recognize that


they’re enemies.

## Page 14

### Heuristics for Game Usability 14


It should be clear what’s happening in the game. Players should 

### understand and be able to identify game elements like the Obstacles


In this getaway game, the obstacles of the blue car and the sidewalks are clear. The darker sidewalk on the sides of the road is identifiably a sidewalk because it has streetlights on it and because it’s in front of buildings. The blue car clearly looks like a car, so it’s an obvious obstacle. In Germany Soccer Shootout, the goal 

### posts are identifiably obstacles to the target


of the goal. This is an established obstacle to anyone familiar with soccer.

## Page 15

### Heuristics for Game Usability 15


It should be clear what’s happening in the game. Players should 

### understand and be able to identify game elements like the Power Ups


The Goomba on the left is an enemy. The Magic Mushroom on the right is a power up. 

### The similar shape and color means that new players can easily confuse the two objects, so


they may avoid the power up as though it were an enem. Give players the feeling they can make a few mistakes by giving some room for error. In the game Skaterboi, if you hit an 

### obstacle then you come to a complete stop


for a full second or two. Players found this to be excessively punishing and frustrating. Instead, collision could have just slowed you down a little or stopped you more briefly.

## Page 16

### Heuristics for Game Usability 16


Players should feel in control, so they need the time and information 

### to respond to threats and opportunities. That is, players should see


enemies, obstacles, and power-ups coming. Germany Soccer Shootout doesn’t give the 

### player enough time to react to the incoming


ball. Because they don’t have time to make predictions, players feel helpless and frustrated. The bubbles (beneath the platform the 

### avatar is currently on) are all that allow


the player to predict which platform will sink. Many players will miss the bubbles, or fail to connect them to the sinking of the platforms.

## Page 17

### Heuristics for Game Usability 17


Control Mapping Use natural mappings. Control mapping should be intuitive enough 

### that new players don’t have to read the instructions. If the game has


relatively complicated controls, new players should be able to play after reading the instructions only once. Soccer Fever uses: 

### Left is clockwise, Right is anti-clockwise


Up is auto-run, down is stop Better: Left is anti-clockwise, Right is clockwise Natural, and best: Left moves left, Right moves right Up moves up, Down moves down

## Page 18

### Heuristics for Game Usability 18


If industry standards exist for the controls on the type of game you’re 

### working on, adhere to them. For example, if most fighting games use


the back button to block, then you should do the same thing. Soul Calibur II and Dead or Alive 3 both use A to block. Marvel Nemesis uses A to 

### attack and Y to block. This violation of control standards makes the game unplayable for


many players. If possible, users should be able to play mobile games with one hand. Skaterboi can be played with one hand, 

### using the thumb on the joystick for


movement. Except that to use weapons you have to hit the # key, though this happens only a few times each level.

## Page 19

### Heuristics for Game Usability 19


Make it hard to accidentally hit the wrong button. The more trouble 

### hitting the wrong button causes, the farther that button should be


from the normal game controls. Suppose there’s a button to kill everything on the screen and you can only do it 3 times. If you make the B trigger have this function, it will be hit accidentally very often. If you make the START button have this function, it will be hit accidentally less often.

## Page 20

### Heuristics for Game Usability 20


Level Design Don’t make it easy for players to get stuck or lost. The goal of the game and the next step towards that goal should always be clear. There should be a sense of progress towards that goal, so players never feel lost or like they’re going around in circles. In the Half Life 2 level Ravenholm, players go in circles on the same level many times. That sense of going in circles makes players feel uncertain about their progress.

## Page 21

### Heuristics for Game Usability 21


Things the player needs to see (enemies, enemy fire, power ups, etc.) 

### should stand out. So everything the player needs to see needs to be


big enough to be perceived. Remember that some players don’t have perfect eyesight. The only object that can damage you in this 

### car chase game is the tiny red dot just to


the left of your car. The object is too small for some players to see. The challenge should be evading the bullet, not seeing it in the first place.

## Page 22

### Heuristics for Game Usability 22


Things the player needs to see (enemies, enemy fire, power ups, etc.) 

### should stand out. To make things stand out, use contrast with the


background: Texture, Color, Brightness (light/dark). Remember that some players will be color blind, so red and green will be seen as the same for some players. Germany Soccer Shootout has examples of 

### three contrast effects:


The texture of the grass makes the smooth ball stand out more. The color contrast on the fuel-style gauge on the right draws attention. And the black parts of the ball makes it stand out against the lighter grass background. The contrast of the white and black spots on the ball also make it draw more attention. Here’s an example of where contrast 

### effects should be used more. The ship in


the water towards the top left is too similar to the other background elements. A different texture, color, or brightness would stand out more and make it easier to identify as an enemy. Note that the plane that’s exiting at the bottom of the screen is highly distinct because the bright pink color is in stark contrast to the background.

## Page 23

### Heuristics for Game Usability 23


Objects in the game should look like they’ll do what they do. This idea is called Affordance. The spiky look of these objects makes them  These objects look like platforms. The 

### look like they’ll hurt you. propeller on the bottom makes them look


like they move around in the air. This object looks springy, so it should have The Mario Bros Goombas looked like you 

### a springy function. Either it will bounce up


could squish them, which was the way they and down, or it will be a platform you can were defeated. bounce off of.

## Page 24

### Heuristics for Game Usability 24


The player shouldn’t easily misinterpret things as power ups, enemies, or obstacles. In Counterstrike, the counter-terrorists and terrorists look fairly similar. The similarity is pronounced when characters are seen at a distance or in low light (look at the red circles). New players have an extremely difficult time differentiating between enemies and friends.

## Page 25

### Heuristics for Game Usability 25


If there are tasks which you expect to be challenging, don’t require 

### players to complete them more than once. That is, make sure that if


they die soon after completing a hard task that they don’t have to complete the hard task again. In Mega Man, players must progress from the top left screen, to the top right screen, to the bottom left screen. The bottom right screen shows the player dead. If the player dies anywhere along the way, the player has to start all over from the beginning of the sequence. And it’s very easy to die.

## Page 26

### Heuristics for Game Usability 26


Conclusions This set of heuristics is one tool to aid usability in game design. I strongly suggest 

### sharing the document with your design team. Reading through the heuristics with the


examples will help you to avoid some common usability mistakes. There’s a checklist at the end which lists all of the heuristics without the examples, for a fast and easy reference. You might revisit the checklist periodically during your design cycle. I want to emphasize and stress again that these are just guidelines, and they won’t catch all your usability problems. In addition to these heuristics, you should also use iterative usability testing and expert analysis. A combination of these techniques, used early and iteratively, forms a solid usability solution. It’s appropriate to see this white paper as a work in progress. So as you find other usability problems, I invite you to send them to me to help the development of an optimal set of heuristics in the future. Just prior to the completion of this white paper, Korhonen and Koivisto (2006) released a set of heuristics which also came from the study of games for mobile phones. We look forward to seeing the fruits of collaboration and synthesis with such other lists.

## Page 27

### Heuristics for Game Usability 27


Heuristics for Usability in Games: Checklist General In a broad sense, make your game intuitive for your  player . This includes controls, Heads Up Displays (HUDs), path finding, and goals. 

•  Minimize flashing.
•  Avoid large blocks of text.
•  Don’t rely on players’ memory.

o  Don’t use abbreviations. o  Don’t require the player to count resources like bullets and life. o  Players shouldn’t have to memorize the level design (but it’s arguable there are exceptions). Graphical User Interface (the persistent displays on the screen, 

### such as life points, score, level, ammunition, ext)

•  All relevant information should be displayed, such as life points, lives, and

ammunition. 

•  Don’t display irrelevant information.
•  Critical information should stand out (ie, if time is very important to the game, then

the timer should be large and in contrast with the background). 

•  Don’t bury frequently used information.
•  Menu item names should be intuitive and obvious.
•  The player should know where they are on the mini-map, if there is one.

Gameplay General 

•  It should be clear what’s happening in the game. Players should understand and be
### able to identify:


o  Goals o  Failure conditions (How they lose) o  Game elements !" Avatar

## Page 28

### Heuristics for Game Usability 28


!" Enemies !" Obstacles !" Power Ups 

•  Give players the feeling they can make a few mistakes by giving some room for error.
•  Players should feel in control, so they need the time and information to respond to
### threats and opportunities. That is, players should see enemies, obstacles, and power-


ups coming. Control Mapping 

•  Use natural mappings. Control mapping should be intuitive enough that new players
### don’t have to read the instructions. If the game has relatively complicated controls,


new players should be able to play after reading the instructions only once. 

•  If industry standards exist for the controls on the type of game you’re working on,
### then adhere to them. For example, if most fighting games use the back button to block,


then you should do the same thing. 

•  If possible, users should be able to play mobile games with one hand.
•  Make it hard to accidentally hit the wrong button. The more trouble hitting the wrong

button causes, the harder the button should be to hit. Level Design 

•  Don’t make it easy for players to get stuck or lost. The goal of the game and the next
### step towards that goal should always be clear. There should be a sense of progress


towards that goal, so players never feel lost or like they’re going around in circles. 

•  Things the player needs to see (enemies, enemy fire, power ups, ext) should stand out

o  Everything the player needs to see needs to be big enough to be perceived. Remember that some players don’t have perfect eyesight. o  To make things stand out, use contrast with the background. !" Texture contrast !" Color contrast !" Light/dark contrast 

•  Objects in the game should look like they’ll do what they do. For example, things that
### make you bounce higher should look springy. Things that kill you should look


dangerous. 

•  The player shouldn’t easily misinterpret things as power ups, enemies, or obstacles.
•  If there are tasks which you expect to be challenging, don’t require players to
### complete them more than once. That is, make sure that if they die soon after


completing a hard task that they don’t have to complete the hard task again.

## Page 29

### Heuristics for Game Usability 29


References Desurvire, Heather; Caplan, Martin; Toth, Jozsef A. (2004). Using Heuristics to Evaluate the Playability of Games.  Conference on Human Factors in Computing Systems . New York: ACM Press. Federoff, Melissa A. (2002). Heuristics and Usability Guidelines for the Creation and Evaluation of Fun in Video Games.  Masters Thesis at Indiana University . Korhonen, Hannu & Koivisto, Elina. (September 2006). Mobile entertainment: Playability heuristics for mobile games. Proceedings of the 8th conference on Human-computer interaction with mobile devices and services MobileHCI '06. ACM Press. Laitinen, Sauli. (2005). Better Games Through Usability Evaluation and Testing. Gamasutra . http://www.gamasutra.com/features/20050623/laitinen_01.shtml 

### Laitinen, Sauli. (2006). Do usability expert evaluation and test provide novel and useful


data for game development?  Journal of Usability Studies . Nielsen, Jakob. (1993).  Usability Engineering . New York: Morgan Kaufmann. Nielsen, Jakob & Giluz, Shuli. (2003).  Usability Return on Investment.  Private Report. Nielsen Norman Group. Romero, R., & Lorusso, T. (2005). Befuddlement in Action: Classic Usability Problems in Games and How to Avoid Them. Presented at the Game Developer’s Conference, San Jose CA.

## Page 30

### Heuristics for Game Usability 30


Acknowledgements First and foremost, thanks very much to Mobile2Win both for the opportunity for 

### collaboration and the use of their games as examples. I’d also like to thank Microsoft’s


Game Studios for their usability tutorial at the Game Developers Conference, as well as their extensive work in the field of game usability. And thanks very much to Melissa Federoff, Sauli Laitinen, Heather Desurvire, Martin Caplan, and Jozsef Toth for their pioneering work in the field of usability heuristics for games. I’d also like to thank Katherine Isbister for her editing and ongoing support.

