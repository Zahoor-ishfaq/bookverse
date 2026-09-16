"""Demo community so a fresh deployment isn't an empty room. Every seeded
member can log in with password `password123` (change or delete them before a
public launch, or set SEED_ON_START=false)."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from .models import (Activity, Challenge, ChallengeParticipant, Club, ClubMember, ClubThread, Debate, DebateVote, DiaryEntry, Follow, Room,
                     RoomMessage, RoomParticipant, Story, StoryChapter, ThreadReply, User)
from .security import hash_password

B = dict(pride=1342, frankenstein=84, moby=2701, sherlock=1661, alice=11, dorian=174, anna=1399, quixote=996, dracula=345, jekyll=43, janeEyre=1260,
         wuthering=768, gatsby=64317, walden=205, persuasion=105, meditations=2680, siddhartha=2500, middlemarch=145, hound=2852, secretGarden=113)


def ago(d: float, h: float = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=d, hours=h)


def ahead(d: float) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=d)


async def seed(db: AsyncSession) -> None:
    pw = hash_password("password123")
    users = {
        "amira": User(id="u_amira", username="amira.reads", display_name="Amira Haddad", email="amira@example.com", password_hash=pw, avatar_color="#A64D62", headline="Reads in Arabic and English", bio="Arabic & English lit. Currently haunted by the Brontës.", location="Beirut", favorite_genres=["Romance", "Poetry"], favorite_moods=["romantic", "calm"], reading_goal=52, is_verified_badge=True, email_verified=True, onboarding_completed=True, links={"x": "amirareads"}),
        "theo": User(id="u_theo", username="theo.marlowe", display_name="Theo Marlowe", email="theo@example.com", password_hash=pw, avatar_color="#3F4F5C", headline="Crime, history, trains", bio="I rate books by how many trains I miss.", location="Manchester", favorite_genres=["Mystery", "History"], favorite_moods=["dark", "philosophical"], reading_goal=30, email_verified=True, onboarding_completed=True),
        "june": User(id="u_june", username="june.oyelaran", display_name="June Oyelaran", email="june@example.com", password_hash=pw, avatar_color="#8A5A2F", headline="Writer of small stories", bio="Writer of small stories. Reader of large ones.", location="Lagos", favorite_genres=["Fiction", "Adventure"], favorite_moods=["adventurous", "funny"], reading_goal=40, is_verified_badge=True, email_verified=True, onboarding_completed=True, links={"website": "https://june.example", "instagram": "june.writes"}),
        "kenji": User(id="u_kenji", username="kenji.wren", display_name="Kenji Wren", email="kenji@example.com", password_hash=pw, avatar_color="#3D6B6B", headline="Philosophy, then fantasy to recover", bio="Philosophy grad who reads fantasy to recover.", location="Kyoto", favorite_genres=["Philosophy", "Fantasy"], favorite_moods=["philosophical", "calm"], reading_goal=20, email_verified=True, onboarding_completed=True),
        "sol": User(id="u_sol", username="sol.ferreira", display_name="Sol Ferreira", email="sol@example.com", password_hash=pw, avatar_color="#8B3A3A", headline="Gothic everything", bio="Gothic everything. Yes, even in July.", location="Porto", favorite_genres=["Horror", "Mystery"], favorite_moods=["dark"], reading_goal=36, email_verified=True, onboarding_completed=True),
        "nadia": User(id="u_nadia", username="nadia.k", display_name="Nadia Khoury", email="nadia@example.com", password_hash=pw, avatar_color="#7A4B8A", headline="Runs four book clubs", bio="Book club organiser. Bring snacks.", location="Amman", favorite_genres=["Fiction", "History"], favorite_moods=["romantic", "philosophical"], reading_goal=60, is_verified_badge=True, email_verified=True, onboarding_completed=True),
        "oscar": User(id="u_oscar", username="oscar.lindqvist", display_name="Oscar Lindqvist", email="oscar@example.com", password_hash=pw, avatar_color="#9A7B12", headline="Reads on ferries", bio="Reads on ferries. Writes on napkins.", location="Stockholm", favorite_genres=["Adventure", "Science"], favorite_moods=["adventurous", "funny"], reading_goal=24, email_verified=True, onboarding_completed=True),
        "admin": User(id="u_admin", username="bookverse", display_name="BookVerse Team", email="admin@bookverse.app", password_hash=pw, avatar_color="#1B6B4A", headline="Official account", bio="News and featured picks from the BookVerse team.", location="Everywhere", is_admin=True, is_verified_badge=True, email_verified=True, onboarding_completed=True),
    }
    for u in users.values():
        u.created_at = ago(400)
        db.add(u)
    await db.flush()

    for a, b in [("amira", "june"), ("amira", "nadia"), ("theo", "sol"), ("theo", "amira"), ("june", "amira"), ("kenji", "theo"), ("sol", "theo"), ("nadia", "amira"), ("nadia", "june"), ("oscar", "june"), ("june", "oscar")]:
        db.add(Follow(follower_id=users[a].id, following_id=users[b].id))

    # ---- clubs ----
    clubs = [
        Club(id="c_gothic", created_by="u_sol", name="The Candlelit Society", description="Gothic novels read slowly, discussed loudly. One chapter a week and we pretend it is 1847.", cover_color="#1B6B4A", cover_emoji="🕯️", current_book_id=B["wuthering"], max_members=500, frequency="Weekly, Sundays", member_count=4,
             schedule=[{"week": 1, "chapters": "Ch. 1–4", "date": "Sep 7"}, {"week": 2, "chapters": "Ch. 5–9", "date": "Sep 14"}, {"week": 3, "chapters": "Ch. 10–15", "date": "Sep 21"}, {"week": 4, "chapters": "Ch. 16–22", "date": "Sep 28"}]),
        Club(id="c_stoics", created_by="u_kenji", name="Morning Pages & Marcus", description="Philosophy for people with jobs. Ten pages a day, one honest conversation a week.", cover_color="#3F4F5C", cover_emoji="🏛️", current_book_id=B["meditations"], max_members=200, frequency="Weekly, Wednesdays", member_count=2, schedule=[{"week": 1, "chapters": "Books 1–2", "date": "Sep 10"}, {"week": 2, "chapters": "Books 3–4", "date": "Sep 17"}]),
        Club(id="c_seafarers", created_by="u_oscar", name="Salt & Ink", description="Sea stories, voyages, and anything with a rigging diagram. Currently harpooning Melville.", cover_color="#8A5A2F", cover_emoji="⚓", current_book_id=B["moby"], max_members=120, frequency="Fortnightly", member_count=2, schedule=[{"week": 1, "chapters": "Ch. 1–16", "date": "Sep 3"}, {"week": 2, "chapters": "Ch. 17–35", "date": "Sep 17"}]),
        Club(id="c_austen", created_by="u_amira", name="Tea With Miss Austen", description="One Austen a season. Strong opinions about Mr. Collins welcome.", cover_color="#A64D62", cover_emoji="🫖", current_book_id=B["persuasion"], max_members=600, frequency="Weekly, Saturdays", member_count=3, schedule=[{"week": 1, "chapters": "Ch. 1–6", "date": "Sep 6"}, {"week": 2, "chapters": "Ch. 7–12", "date": "Sep 13"}]),
        Club(id="c_private", created_by="u_theo", name="The Thursday Murder Readers", description="Invite only. We solve the case before chapter twelve.", cover_color="#8B3A3A", cover_emoji="🔍", current_book_id=B["hound"], max_members=30, frequency="Thursdays", is_private=True, member_count=2),
    ]
    for c in clubs:
        c.created_at = ago(60)
        db.add(c)
    members = {"c_gothic": ["u_sol", "u_amira", "u_theo", "u_nadia"], "c_stoics": ["u_kenji", "u_theo"], "c_seafarers": ["u_oscar", "u_june"], "c_austen": ["u_amira", "u_nadia", "u_june"], "c_private": ["u_theo", "u_sol"]}
    for cid, ids in members.items():
        for i, uid in enumerate(ids):
            db.add(ClubMember(club_id=cid, user_id=uid, role="owner" if i == 0 else "member"))
    threads = [
        ClubThread(id="t1", club_id="c_gothic", user_id="u_sol", chapter=3, title="Lockwood is the worst houseguest in literature", body="He reads a dead woman’s diary, has a nightmare, and then complains about the hospitality. I love him. Discuss.", pinned=True, like_count=31, created_at=ago(2)),
        ClubThread(id="t2", club_id="c_gothic", user_id="u_nadia", chapter=9, title="“I am Heathcliff” — romantic or a warning sign?", body="Cathy’s speech to Nelly. Read it once as a teenager, read it again now. Very different book.", spoilers=True, like_count=18, created_at=ago(1)),
        ClubThread(id="t3", club_id="c_stoics", user_id="u_kenji", chapter=2, title="Book 2, first line. Every morning.", body="“Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, arrogant…” I read this before checking email now.", like_count=44, created_at=ago(3)),
        ClubThread(id="t4", club_id="c_seafarers", user_id="u_oscar", chapter=1, title="Call me confused: is Ishmael reliable?", body="He tells us his name like a dare. Anyone else suspect he is making half of this up?", like_count=12, created_at=ago(5)),
        ClubThread(id="t5", club_id="c_austen", user_id="u_amira", chapter=4, title="Anne Elliot deserves a better family and a nap", body="Eight years of regret packed into a drawing room. This is the most grown-up Austen and I will not be taking questions.", like_count=61, created_at=ago(1, 8)),
    ]
    db.add_all(threads)
    await db.flush()
    db.add_all([
        ThreadReply(thread_id="t1", user_id="u_theo", body="He is us. We all showed up uninvited to this book and started judging.", like_count=14, created_at=ago(1)),
        ThreadReply(thread_id="t1", user_id="u_amira", body="The ghost-at-the-window scene still gets me. Brontë does more with a broken pane than most do with a whole castle.", like_count=22, created_at=ago(1, 3)),
        ThreadReply(thread_id="t2", user_id="u_sol", body="Both. That is the whole point of the moors.", like_count=9, created_at=ago(0, 5)),
        ThreadReply(thread_id="t4", user_id="u_june", body="All of it. Beautifully.", like_count=7, created_at=ago(4)),
    ])

    # ---- rooms ----
    rooms = [
        Room(id="r_dorian", created_by="u_sol", book_id=B["dorian"], title="Dorian Gray — the portrait reveal, live", description="Reading chapter 13 together. Bring your gasp.", is_live=True, participant_count=5, pinned_quote="It is the face of my soul."),
        Room(id="r_alice", created_by="u_june", book_id=B["alice"], title="Alice, out loud (family friendly)", description="Taking turns reading the Mad Tea-Party.", is_live=True, participant_count=2),
        Room(id="r_frank", created_by="u_kenji", book_id=B["frankenstein"], title="Frankenstein: the creature speaks", description="Chapters 11–16, the creature’s own account.", is_live=False, scheduled_at=ahead(1), participant_count=0),
        Room(id="r_anna", created_by="u_nadia", book_id=B["anna"], title="Anna Karenina, Part 7 — spoilers allowed", description="You know what happens. Let’s talk about the train.", is_live=False, scheduled_at=ahead(3), participant_count=0),
        Room(id="r_past", created_by="u_sol", book_id=B["dracula"], title="Midnight Dracula read-along", description="Ended. Transcript available for 7 days.", is_live=False, ended_at=ago(2), participant_count=88),
    ]
    db.add_all(rooms)
    for rid, ids in {"r_dorian": ["u_sol", "u_amira", "u_theo", "u_kenji", "u_nadia"], "r_alice": ["u_june", "u_oscar"]}.items():
        for uid in ids:
            db.add(RoomParticipant(room_id=rid, user_id=uid))
    db.add_all([
        RoomMessage(room_id="r_dorian", user_id="u_sol", text="Alright, everyone on chapter 13? Lights off, please.", created_at=ago(0, 1)),
        RoomMessage(room_id="r_dorian", user_id="u_amira", text="Basil is about to have the worst evening of his life and he is being SO polite about it.", created_at=ago(0, 0.95)),
        RoomMessage(room_id="r_dorian", user_id="u_theo", text="It is the face of my soul.", type="quote", created_at=ago(0, 0.9)),
        RoomMessage(room_id="r_dorian", user_id="u_kenji", text="Wilde writing a horror scene with the same rhythm as his jokes is genuinely unsettling.", created_at=ago(0, 0.8)),
        RoomMessage(room_id="r_dorian", user_id="u_nadia", text="😱", type="reaction", created_at=ago(0, 0.7)),
        RoomMessage(room_id="r_alice", user_id="u_june", text="Why is a raven like a writing-desk? Answers in the chat.", created_at=ago(0, 0.5)),
        RoomMessage(room_id="r_alice", user_id="u_oscar", text="Poe wrote on both.", created_at=ago(0, 0.4)),
        RoomMessage(room_id="r_past", user_id="u_sol", text="Thank you all. Sleep with the window closed.", created_at=ago(2)),
    ])

    # ---- debates ----
    debates = [
        Debate(id="d_anna", created_by="u_nadia", book_id=B["anna"], question="Was the ending of Anna Karenina satisfying?", side_a="Yes — inevitable and honest", side_b="No — Tolstoy punished her", count_a=1284, count_b=1871, ends_at=ahead(2)),
        Debate(id="d_quixote", created_by="u_kenji", book_id=B["quixote"], question="Is Don Quixote overrated?", side_a="Yes, it is a long joke", side_b="No, it invented the novel", count_a=402, count_b=1930, ends_at=ahead(5)),
        Debate(id="d_heathcliff", created_by="u_sol", book_id=B["wuthering"], question="Is Heathcliff a romantic hero?", side_a="Yes, tragically", side_b="Absolutely not", count_a=733, count_b=2210, ends_at=ahead(1)),
        Debate(id="d_gatsby", created_by="u_theo", book_id=B["gatsby"], question="Is Nick Carraway a reliable narrator?", side_a="Reliable enough", side_b="Not remotely", count_a=610, count_b=980, ends_at=ahead(6)),
    ]
    db.add_all(debates)
    db.add_all([
        DebateVote(debate_id="d_anna", user_id="u_nadia", side="b", argument="Levin gets a farm and an epiphany. Anna gets a train. The book knows exactly what it is doing and I resent it.", like_count=210),
        DebateVote(debate_id="d_anna", user_id="u_theo", side="a", argument="Every choice she makes is hers. Tolstoy just refuses to look away, and that is the respect she is owed.", like_count=164),
        DebateVote(debate_id="d_anna", user_id="u_amira", side="b", argument="Satisfying and right are different things. It is right. It is not satisfying. That is the tragedy working.", like_count=98),
        DebateVote(debate_id="d_quixote", user_id="u_kenji", side="b", argument="Part Two has the characters reading Part One. In 1615. Everything postmodern is a footnote.", like_count=320),
        DebateVote(debate_id="d_quixote", user_id="u_oscar", side="a", argument="I love it. It is also 900 pages of a man falling off a horse.", like_count=88),
        DebateVote(debate_id="d_heathcliff", user_id="u_sol", side="b", argument="He hangs a dog. I do not know what else you need.", like_count=501),
        DebateVote(debate_id="d_heathcliff", user_id="u_june", side="a", argument="The book never asks you to approve of him, only to feel the size of the want.", like_count=143),
        DebateVote(debate_id="d_gatsby", user_id="u_theo", side="b", argument="“I am one of the few honest people I have ever known.” Sir.", like_count=276),
    ])

    # ---- stories ----
    s1 = Story(id="s_lighthouse", author_id="u_june", title="The Lighthouse Keeper’s Last Letter", tagline="Forty years of silence, one envelope, and a tide that will not wait.", cover_color="#8A5A2F", cover_pattern="waves", genres=["Literary", "Historical"], inspired_by_book_id=B["moby"], is_serial=True, is_complete=False, word_count=14200, view_count=18400, like_count=2310, bookmark_count=890, comment_count=412, is_featured=True, published_at=ago(21))
    s2 = Story(id="s_mrshyde", author_id="u_oscar", title="Mrs. Hyde", tagline="What if the doctor’s wife had known all along?", cover_color="#1B6B4A", cover_pattern="stripes", genres=["Gothic", "Retelling"], inspired_by_book_id=B["jekyll"], word_count=6100, view_count=9200, like_count=1140, bookmark_count=402, comment_count=187, published_at=ago(9))
    s3 = Story(id="s_thursday", author_id="u_amira", title="A Thursday in Netherfield", tagline="Charlotte Lucas keeps a diary. It is not what you expect.", cover_color="#A64D62", cover_pattern="dots", genres=["Romance", "Retelling"], inspired_by_book_id=B["pride"], is_serial=True, is_complete=False, word_count=9800, view_count=12700, like_count=1980, bookmark_count=760, comment_count=301, published_at=ago(30))
    s4 = Story(id="s_orbit", author_id="u_kenji", title="Small Orbits", tagline="Twelve very short stories about people who almost meet.", cover_color="#3F4F5C", cover_pattern="grid", genres=["Flash Fiction", "Literary"], is_serial=True, is_complete=False, word_count=3300, view_count=4100, like_count=620, bookmark_count=210, comment_count=74, published_at=ago(6))
    s5 = Story(id="s_garden", author_id="u_nadia", title="The Garden After", tagline="Mary Lennox, aged sixty, goes back.", cover_color="#3D6B6B", cover_pattern="waves", genres=["Literary", "Retelling"], inspired_by_book_id=B["secretGarden"], word_count=4800, view_count=7600, like_count=1320, bookmark_count=505, comment_count=156, published_at=ago(12))
    db.add_all([s1, s2, s3, s4, s5])
    await db.flush()
    db.add_all([
        StoryChapter(story_id="s_lighthouse", number=1, title="The Envelope", comment_count=140, created_at=ago(21), content=[
            "The letter arrived on a Tuesday, which Maren found unforgivable. Tuesdays were for mending nets and for nothing else, and here was the postman standing in her doorway holding a thing so old the paper had gone the colour of weak tea.",
            "“It was in the wall,” he said, as if that explained anything. “They’re taking down the old keeper’s cottage. Found a whole bundle behind the plaster. This one had your name on it.”",
            "It did not have her name on it. It had her mother’s name on it, in a hand she had last seen on a shopping list forty years ago. But she did not correct him. She took the envelope, and she closed the door, and she sat down at the kitchen table with the nets still wet in the sink.",
            "Outside, the tide was going out. It always was, in this town. It went out and out and never quite seemed to come back to where it started."]),
        StoryChapter(story_id="s_lighthouse", number=2, title="What the Wall Knew", comment_count=98, created_at=ago(14), content=[
            "There were eleven letters in the bundle, and Maren read them in the wrong order, because the right order would have meant admitting she was afraid of the first one.",
            "The keeper’s handwriting improved as the years went on. That was the first thing she noticed. In 1961 it was cramped and apologetic; by 1974 it had learned to take up space on the page."]),
        StoryChapter(story_id="s_lighthouse", number=3, title="Low Water", comment_count=61, created_at=ago(3), content=[
            "The lamp had not been lit in thirty years, but the stairs still remembered the shape of feet. Maren counted them the way her mother must have. One hundred and twelve. She stopped on the ninety-third to breathe, and to decide whether she was going to keep going."]),
        StoryChapter(story_id="s_mrshyde", number=1, title="Mrs. Hyde", comment_count=187, created_at=ago(9), content=[
            "People assume I found out. They picture a locked door, a smashed vial, a scream. The truth is duller and worse: I noticed his handwriting change on the grocery orders, and I chose to say nothing, because the other one tipped better.",
            "Henry was a kind man in the way a clock is kind — reliable, and only because it has no choice. Edward was not kind. But Edward asked me what I thought about things."]),
        StoryChapter(story_id="s_thursday", number=1, title="On Being Sensible", comment_count=301, created_at=ago(30), content=["I am seven and twenty and I have been called sensible so many times that I have begun to hear it as a diagnosis.", "Lizzy thinks I have settled. Lizzy has never had to count the candles."]),
        StoryChapter(story_id="s_orbit", number=1, title="The Elevator", comment_count=74, created_at=ago(6), content=["They rode eleven floors together and she almost said something about his book. He almost noticed she was holding the same one."]),
        StoryChapter(story_id="s_garden", number=1, title="The Garden After", comment_count=156, created_at=ago(12), content=["The key was still under the same stone, which was either a kindness or a failure of imagination on someone’s part."]),
    ])

    # ---- diary ----
    diary = [
        DiaryEntry(id="de1", user_id="u_amira", book_id=B["janeEyre"], title="Reading Jane Eyre on the balcony while the power was out", body="No electricity, one candle, and Bertha in the attic. I don’t think I have ever been so perfectly situated for a book. Finished the red-room chapter by candlelight and had to put it down to breathe.", mood="dark", location="Beirut", like_count=214, created_at=ago(1, 4)),
        DiaryEntry(id="de2", user_id="u_kenji", book_id=B["walden"], title="Walden is a bit smug and I love him anyway", body="Thoreau walked home for dinner most nights. I know this. I still underlined half of chapter two. “Simplify, simplify.” Yes, Henry, I am trying.", mood="calm", location="Kyoto", like_count=88, created_at=ago(2)),
        DiaryEntry(id="de3", user_id="u_june", title="A day I did not read", body="Wrote 1,400 words of the lighthouse story instead. It counts. I have decided it counts.", mood="funny", like_count=340, created_at=ago(3)),
        DiaryEntry(id="de4", user_id="u_sol", book_id=B["dracula"], title="Started Dracula again. October came early.", body="Jonathan Harker’s diary entries are the original travel blog and nobody can convince me otherwise. “The paprika was excellent.” Sir, you are in mortal danger.", mood="dark", location="Porto", like_count=176, created_at=ago(4)),
        DiaryEntry(id="de5", user_id="u_theo", book_id=B["sherlock"], title="Missed my stop for Holmes. Worth it.", body="The Speckled Band on the 7:42. Ended up in Stockport. Sat on the platform and finished it. No regrets, mild lateness.", mood="adventurous", location="Manchester", like_count=129, created_at=ago(5)),
        DiaryEntry(id="de6", user_id="u_nadia", book_id=B["persuasion"], title="The letter. THE LETTER.", body="“You pierce my soul. I am half agony, half hope.” Read it three times, texted it to two people, cried in a café. Persuasion is Austen’s best and this is the proof.", mood="romantic", location="Amman", like_count=402, created_at=ago(6)),
    ]
    db.add_all(diary)

    # ---- challenges ----
    ch = [
        Challenge(id="ch_autumn", created_by="u_admin", title="Autumn of Gothic", description="Read 5 gothic novels before the first frost. Frankenstein, Dracula, Jane Eyre, Wuthering Heights and one wildcard.", type="books", target=5, start_date=date.today() - timedelta(days=14), end_date=date.today() + timedelta(days=76), participant_count=4),
        Challenge(id="ch_streak", created_by="u_admin", title="30 Days, 30 Chapters", description="One chapter a day for a month. Any book. Streak resets if you miss a day — no pressure, just fire.", type="streak", target=30, start_date=date.today() - timedelta(days=10), end_date=date.today() + timedelta(days=20), participant_count=4),
        Challenge(id="ch_bingo", created_by="u_admin", title="Around the World Bingo", description="Read a book set on each continent. Antarctica is optional but respected.", type="genre_bingo", target=6, start_date=date.today() - timedelta(days=40), end_date=date.today() + timedelta(days=140), participant_count=2),
        Challenge(id="ch_write", created_by="u_admin", title="September Prompt: Rewrite an Ending", description="Take any book on BookVerse and rewrite its final scene from a minor character’s point of view. 500–1,500 words. Top three earn a featured badge.", type="writing", target=1, start_date=date.today() - timedelta(days=13), end_date=date.today() + timedelta(days=17), participant_count=3, prompt="Rewrite the ending of a classic from a minor character’s point of view."),
    ]
    db.add_all(ch)
    db.add_all([ChallengeParticipant(challenge_id="ch_autumn", user_id=u, value=v) for u, v in [("u_sol", 4), ("u_amira", 3), ("u_theo", 2), ("u_kenji", 1)]] +
               [ChallengeParticipant(challenge_id="ch_streak", user_id=u, value=v) for u, v in [("u_nadia", 10), ("u_june", 10), ("u_kenji", 3), ("u_oscar", 2)]] +
               [ChallengeParticipant(challenge_id="ch_bingo", user_id=u, value=v) for u, v in [("u_oscar", 4), ("u_theo", 3)]] +
               [ChallengeParticipant(challenge_id="ch_write", user_id=u, value=v) for u, v in [("u_oscar", 412), ("u_amira", 388), ("u_kenji", 201)]])

    # ---- activity feed ----
    db.add_all([
        Activity(user_id="u_amira", verb="highlighted", book_id=B["janeEyre"], text="I am no bird; and no net ensnares me: I am a free human being with an independent will.", created_at=ago(0, 1)),
        Activity(user_id="u_sol", verb="finished", book_id=B["dracula"], rating=5, created_at=ago(0, 4)),
        Activity(user_id="u_amira", verb="diary", ref_type="diary", ref_id="de1", created_at=ago(1, 4)),
        Activity(user_id="u_june", verb="chapter", ref_type="story", ref_id="s_lighthouse", text="3", created_at=ago(1, 6)),
        Activity(user_id="u_theo", verb="reviewed", book_id=B["sherlock"], rating=4.5, text="Holmes is insufferable and I would follow him into any fog in London.", created_at=ago(1, 9)),
        Activity(user_id="u_sol", verb="club_created", ref_type="club", ref_id="c_gothic", text="Week 2 discussion opened — Chapters 5–9 of Wuthering Heights", created_at=ago(2)),
        Activity(user_id="u_kenji", verb="started", book_id=B["siddhartha"], created_at=ago(2, 3)),
        Activity(user_id="u_nadia", verb="diary", ref_type="diary", ref_id="de6", created_at=ago(2, 8)),
        Activity(user_id="u_june", verb="finished", book_id=B["middlemarch"], rating=5, created_at=ago(3, 5)),
        Activity(user_id="u_june", verb="diary", ref_type="diary", ref_id="de3", created_at=ago(3, 7)),
        Activity(user_id="u_oscar", verb="highlighted", book_id=B["moby"], text="It is not down on any map; true places never are.", created_at=ago(4)),
    ])
    await db.commit()
