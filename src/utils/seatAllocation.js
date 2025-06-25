// Utility functions for seat allocation logic

export const allocateSeatsForExam = (students, rooms, exam) => {
  // Filter students eligible for this exam
  const eligibleStudents = students.filter(student => 
    student.department === exam.department &&
    student.semester === exam.semester
  );

  // Remove duplicates based on registration number
  const uniqueStudents = eligibleStudents.filter((student, index, self) =>
    index === self.findIndex(s => s.regNo === student.regNo)
  );

  // Sort students by registration number for consistent ordering
  const sortedStudents = uniqueStudents.sort((a, b) => a.regNo.localeCompare(b.regNo));

  // Sort rooms by capacity (smaller rooms first, then larger)
  const sortedRooms = [...rooms].sort((a, b) => a.capacity - b.capacity);

  const allocations = [];
  let studentIndex = 0;

  // Allocate students to rooms
  for (const room of sortedRooms) {
    if (studentIndex >= sortedStudents.length) break;

    const roomCapacity = room.capacity;
    const studentsForRoom = [];

    // Fill room with students (2 students per bench, A and B sides)
    for (let i = 0; i < roomCapacity && studentIndex < sortedStudents.length; i++) {
      studentsForRoom.push({
        student: sortedStudents[studentIndex],
        room: room,
        exam: exam,
        seatNumber: `${i % 2 === 0 ? 'A' : 'B'}${Math.floor(i / 2) + 1}`
      });
      studentIndex++;
    }

    allocations.push(...studentsForRoom);
  }

  return allocations;
};

export const groupAllocationsByRoom = (allocations) => {
  return allocations.reduce((acc, allocation) => {
    const roomNo = allocation.room.room_no;
    if (!acc[roomNo]) {
      acc[roomNo] = [];
    }
    acc[roomNo].push(allocation);
    return acc;
  }, {});
};

export const validateAllocation = (allocations, totalStudents) => {
  const allocatedStudents = allocations.length;
  const uniqueStudents = new Set(allocations.map(a => a.student.regNo)).size;
  
  return {
    isValid: allocatedStudents === uniqueStudents,
    allocatedCount: allocatedStudents,
    totalCount: totalStudents,
    duplicatesFound: allocatedStudents !== uniqueStudents
  };
};

export const generateSeatArrangement = (roomAllocations) => {
  // Sort by seat number for proper arrangement
  return roomAllocations.sort((a, b) => {
    const aNum = parseInt(a.seatNumber.substring(1));
    const bNum = parseInt(b.seatNumber.substring(1));
    const aSide = a.seatNumber.charAt(0);
    const bSide = b.seatNumber.charAt(0);
    
    if (aNum !== bNum) return aNum - bNum;
    return aSide.localeCompare(bSide);
  });
};