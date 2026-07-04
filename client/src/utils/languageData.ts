// Artists who sing EXCLUSIVELY (or overwhelmingly) in one language.
// Multi-language singers (Shreya Ghoshal, Anirudh, Karthik, etc.) are intentionally
// excluded here — their songs are caught via album / film name matching instead.
export const UNIQUE_ARTISTS: Record<string, string[]> = {
  telugu: [
    // Playback singers
    'Sunitha', 'Harika Narayan', 'Ramya Behara', 'Deepika Das', 'Sahiti',
    'Pranavi Atla', 'Kaala Bhairava', 'Hemachandra', 'Sri Krishna',
    'Sriram Chandra', 'Geetha Madhuri', 'Padmalatha', 'Chitra',
    // Music directors who sometimes appear as artists
    'SS Thaman', 'S. S. Thaman', 'Thaman S', 'DSP', 'Devi Sri Prasad',
    'Anup Rubens', 'Mickey J Meyer', 'Mani Sharma',
  ],
  tamil: [
    'Haricharan', 'Shakthisree Gopalan', 'Swetha Mohan', 'Sathyaprakash',
    'Divakar', 'Vijay Yesudas', 'Bamba Bakya', 'Kavitha Krishnamurthy',
    // Music directors
    'Yuvan Shankar Raja', 'D. Imman', 'D.Imman', 'Harris Jayaraj',
    'Leon James', 'G.V. Prakash Kumar', 'Anirudh Ravichander',
  ],
  kannada: [
    'V. Harikrishna', 'Ravi Basrur', 'Arjun Janya', 'B. Ajaneesh Loknath',
    'Rajesh Krishnan', 'Anuradha Bhat', 'Chandan Shetty', 'Armaan Malik',
  ],
  malayalam: [
    'M. Jayachandran', 'Vidyasagar', 'Bijibal', 'Ouseppachan',
    'Sithara Krishnakumar', 'Vineeth Sreenivasan', 'Gopi Sundar',
    'K. S. Chithra',
  ],
  hindi: [
    'Arijit Singh', 'Jubin Nautiyal', 'Neha Kakkar', 'Armaan Malik',
    'Atif Aslam', 'Mohit Chauhan', 'Javed Ali', 'Palak Muchhal',
    'Monali Thakur', 'Vishal Dadlani', 'Shaan', 'Kumar Sanu', 'Alka Yagnik',
    'Udit Narayan', 'Lata Mangeshkar', 'Kishore Kumar', 'Shankar Mahadevan',
    'Sonu Nigam',
  ],
  english: [
    'Ed Sheeran', 'Taylor Swift', 'Adele', 'Drake', 'Rihanna', 'Justin Bieber',
    'The Weeknd', 'Billie Eilish', 'Ariana Grande', 'Post Malone', 'Dua Lipa',
    'Harry Styles', 'Olivia Rodrigo', 'Shawn Mendes', 'Sam Smith', 'Coldplay',
    'Imagine Dragons', 'Maroon 5', 'Bruno Mars', 'Charlie Puth', 'Khalid',
    'Doja Cat', 'SZA', 'Lizzo', 'Camila Cabello', 'Selena Gomez', 'Justin Timberlake',
    'Beyoncé', 'Lady Gaga', 'Katy Perry', 'Eminem', 'Kendrick Lamar', 'J. Cole',
    'Travis Scott', 'Cardi B', 'Nicki Minaj', 'Lil Baby', 'Lil Uzi Vert',
    'Twenty One Pilots', 'Panic! at the Disco', 'Fall Out Boy', 'Paramore',
    'Arctic Monkeys', 'The 1975', 'Tame Impala', 'Radiohead', 'Blur',
    'Oasis', 'The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd',
    'Michael Jackson', 'Whitney Houston', 'Mariah Carey', 'Celine Dion',
    'Elvis Presley', 'Frank Sinatra', 'John Legend', 'Usher', 'Chris Brown',
  ],
  punjabi: [
    'Karan Aujla', 'Diljit Dosanjh', 'AP Dhillon', 'Shubh', 'Sidhu Moose Wala',
    'Amrinder Gill', 'Gur Sidhu', 'Prem Dhillon', 'Nimrat Khaira', 'Gurnam Bhullar',
    'Jass Manak', 'Arjan Dhillon', 'Navaan Sandhu', 'Raf Saperra', 'Jazzy B',
    'Bohemia', 'The PropheC', 'Mankirt Aulakh', 'Tarsem Jassar', 'Jordan Sandhu',
    'Ammy Virk', 'Ranjit Bawa', 'Happy Raikoti', 'Ikky', 'Badshah',
  ],
};

// Major film soundtracks per language.
// Matching against the track's album name catches transliterated songs
// (e.g. "Naatu Naatu" → album "RRR" → Telugu).
export const KNOWN_FILMS: Record<string, string[]> = {
  telugu: [
    'Pushpa', 'RRR', 'Ala Vaikunthapurramuloo', 'Bheemla Nayak',
    'Sarkaru Vaari Paata', 'Radhe Shyam', 'Saaho', 'Baahubali',
    'Magadheera', 'Eega', 'Nannaku Prematho', 'S/O Satyamurthy',
    'Fidaa', 'Geetha Govindam', 'Arjun Reddy', 'Jersey',
    'Dear Comrade', 'Aravinda Sametha', 'Maharshi', 'Oopiri',
    'Srimanthudu', 'Seetha Ramam', 'Dasara', 'Kushi', 'Hanu-Man',
    'Guntur Kaaram', 'Tillu Square', 'Devara', 'Taxiwaala',
    'World Famous Lover', 'Vakeel Saab', 'Krack', 'F2', 'F3',
    'Akhanda', 'Waltair Veerayya', 'Veera Simha Reddy', 'Skanda',
    'Kisi Ka Bhai Kisi Ki Jaan', 'Ante Sundaraniki', 'Bro',
  ],
  tamil: [
    'Master', 'Vikram', 'Beast', 'Ponniyin Selvan', 'Varisu',
    'Jailer', 'Leo', 'Kaithi', 'Doctor', 'Annaatthe', 'Karnan',
    'Soorarai Pottru', 'Super Deluxe', 'Mersal', 'Sarkar',
    'Kabali', 'Enthiran', 'Bigil', 'Vinnaithaandi Varuvaayaa', 'Ko',
    'Thuppakki', 'Kaththi', 'Roja', 'Bombay', 'Dil Se', 'Thalapathy',
    'Rajini', 'Lokesh Kanagaraj', 'Kurup', 'Valimai', 'Thunivu',
    'Pathu Thala', 'Mark Antony', 'Jawan', 'Jawaan',
  ],
  kannada: [
    'KGF', 'K.G.F', 'Kantara', 'Vikrant Rona', 'Yuvarathnaa',
    '777 Charlie', 'Kirik Party', 'Ulidavaru Kandanthe', 'Lucia',
    'Tagaru', 'Raajakumara', 'Saamy', 'Mufti', 'Tarak',
    'Roberrt', 'Garuda Gamana Vrishabha Vahana', 'Salaga',
  ],
  malayalam: [
    'Premam', 'Bangalore Days', 'Charlie', 'Drishyam', 'Lucifer',
    'Kumbalangi Nights', 'Jallikattu', 'Minnal Murali', 'Malik',
    'Naradan', 'Bheeshma Parvam', 'Joji', "Sara's", 'Trance',
    'Aadujeevitham', 'Bramayugam', 'Manjummel Boys', 'Varshangalkku Shesham',
    'Marco', 'Identity', 'L2 Empuraan',
  ],
};

// Explicit language labels Spotify includes in album/track names.
// E.g. "Pushpa: The Rise (Telugu)" or "Master [Tamil]"
export const ALBUM_LANGUAGE_MARKERS: Record<string, string[]> = {
  telugu:    ['telugu', '(telugu)', '[telugu]', '- telugu'],
  tamil:     ['tamil', '(tamil)', '[tamil]', '- tamil'],
  kannada:   ['kannada', '(kannada)', '[kannada]', '- kannada'],
  malayalam: ['malayalam', '(malayalam)', '[malayalam]'],
  hindi:     ['hindi', 'bollywood', 'filmi', 'hindi version'],
  punjabi:   ['punjabi', 'bhangra', '(punjabi)', '[punjabi]'],
  bengali:   ['bengali', '(bengali)', '[bengali]'],
  gujarati:  ['gujarati', '(gujarati)', '[gujarati]'],
  urdu:      ['urdu', '(urdu)'],
  english:   ['english version', 'english mix'],
  korean:    ['korean', 'k-pop', 'kpop'],
};
