import { prisma } from '@smrkomed/database';

async function updateFlows() {
  const flows = await prisma.whatsAppFlow.findMany({
    where: {
      OR: [
        { id: 'cmtpj6foa001znv105flxjlj1' },
        { id: 'cmtphs4ru0001mj100ywk8pdo' }
      ]
    }
  });

  console.log(`Found ${flows.length} flows to update.`);

  const channelChoiceNode = {
    id: 'n_channel_choice',
    type: 'SEND_BUTTONS',
    label: 'Choose Booking Method',
    config: {
      body: '👋 Welcome to *SmrkoMed*!\n\nHow would you like to book your consultation today?',
      buttons: [
        { id: 'btn_book_wa', title: '💬 Book on WhatsApp' },
        { id: 'btn_ai_call', title: '📞 AI Phone Call' }
      ],
      waitForReply: true
    },
    position: { x: 250, y: 180 }
  };

  const callAckNode = {
    id: 'n_call_ack',
    type: 'SEND_TEXT',
    label: 'AI Call Initiated',
    config: {
      body: '📞 Calling you right now!\n\nOur AI Care Assistant is dialing your phone number to assist you with booking your consultation with Dr. Ananya Rao or our specialists.\n\nPlease pick up when your phone rings! 📲\n\n_If you miss the call, reply *CALL* to retry, or *1* to book here on WhatsApp._'
    },
    position: { x: 450, y: 280 }
  };

  for (const flow of flows) {
    const def = typeof flow.definition === 'string' ? JSON.parse(flow.definition) : flow.definition;
    const existingNodes = (def.nodes || []).filter((n: any) => n.id !== 'n_channel_choice' && n.id !== 'n_call_ack');
    const existingEdges = (def.edges || []).filter((e: any) => 
      e.id !== 'e_choice_wa' && 
      e.id !== 'e_choice_call' && 
      e.id !== 'e_call_end' &&
      e.id !== 'e2_intent_to_choice' &&
      !(e.source === 'n_detect_intent' && e.branch === 'appointment')
    );

    const newNodes = [
      ...existingNodes,
      channelChoiceNode,
      callAckNode
    ];

    const newEdges = [
      ...existingEdges,
      { id: 'e2_intent_to_choice', source: 'n_detect_intent', target: 'n_channel_choice', branch: 'appointment' },
      { id: 'e_choice_wa', source: 'n_channel_choice', target: 'n_welcome', branch: 'btn_book_wa' },
      { id: 'e_choice_call', source: 'n_channel_choice', target: 'n_call_ack', branch: 'btn_ai_call' },
      { id: 'e_call_end', source: 'n_call_ack', target: 'node_end' }
    ];

    await prisma.whatsAppFlow.update({
      where: { id: flow.id },
      data: {
        definition: { nodes: newNodes, edges: newEdges }
      }
    });
    console.log('Successfully updated flow:', flow.id, flow.name);
  }

  // Cancel any old hanging WAITING executions on n_show_doctors or other steps so clean fresh flow runs
  const cancelled = await prisma.whatsAppFlowExecution.updateMany({
    where: {
      status: 'WAITING'
    },
    data: {
      status: 'CANCELLED',
      error: 'Cancelled for new flow update'
    }
  });
  console.log('Cancelled stale waiting executions count:', cancelled.count);
}

updateFlows()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
