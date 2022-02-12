import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Deed } from '../target/types/deed';

describe('deed', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Deed as Program<Deed>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
