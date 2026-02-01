# Trivia Quiz App Implementation TODO

## 1. Enhance Lobby Page

- [x] Add horizontal carousel for categories (Agriculture, Science, Art, History, etc.)
- [x] Add sliders for number of questions and time limit
- [x] Add ready buttons for all users (host and guests)
- [x] Sync settings and ready states via WebSockets
- [x] Update UI to show host dashboard and guest read-only view

## 2. Update Socket Server

- [x] Add events for ready states (player_ready, all_ready)
- [x] Add events for settings changes (update_settings)
- [x] Integrate Open Trivia DB API for fetching questions
- [x] Implement client-side shuffling logic
- [x] Update start_game event to include settings and questions

## 3. Implement Quiz Experience

- [x] Update game page with question display
- [x] Add 4 Neubrutalist buttons for answers
- [x] Implement countdown timer bar
- [x] Store user answers locally
- [x] Sync scores to server after each question
- [x] Handle question progression and game end

## 4. Add Results Page

- [x] Create app/results/[roomCode]/page.tsx
- [x] Implement leaderboard with top 3 podium (1st gold, 2nd silver, 3rd bronze)
- [x] Add full standings list from 4th place down
- [x] Add personal review section with passed/failed breakdown
- [x] Color-code answers (green for correct, red for incorrect)
- [x] Show question text, user's answer, and correct answer

## 5. PWA Support

- [x] Create public/sw.js service worker
- [x] Configure service worker for offline capabilities
- [x] Test "Add to Home Screen" functionality

## Testing and Verification

- [ ] Run development server and test all workflows
- [ ] Verify real-time sync across clients
- [ ] Test PWA installation and offline functionality
- [ ] Ensure compatibility with Open Trivia DB categories
