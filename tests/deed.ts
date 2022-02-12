import * as anchor from '@project-serum/anchor';
import { web3 } from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Deed } from '../target/types/deed';
import { expect } from 'chai'

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

describe('deed', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Deed as Program<Deed>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const lawyer = web3.Keypair.generate();
  const beneficiary = web3.Keypair.generate();
  /*
  const zeroAccountRentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);

  provider.send(new web3.Transaction().add(
    web3.SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      lamports: zeroAccountRentExempt,
      newAccountPubkey: beneficiary.publicKey,
      programId: web3.SystemProgram.programId,
      space: 0,
    })
  ));
  */

  it('Init', async () => {
    const deed = web3.Keypair.generate();

    await program.methods
      .initialize(lawyer.publicKey, beneficiary.publicKey, new anchor.BN(1), new anchor.BN(web3.LAMPORTS_PER_SOL))
      .accounts({deed: deed.publicKey})
      .signers([deed])
      .rpc();
    
    const deedAccount = await program.account.deed.fetch(deed.publicKey);
    expect(deedAccount.lawyer).to.be.deep.equal(lawyer.publicKey);
    expect(deedAccount.beneficiary).to.be.deep.equal(beneficiary.publicKey);
    
    const deedBalance = await provider.connection.getBalance(deed.publicKey);
    expect(deedBalance).to.be.equal(web3.LAMPORTS_PER_SOL);
  });

  it('Withdraw', async() => {
    // Create non-empty beneficiary account
    const zeroAccountRentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
    provider.send(new web3.Transaction().add(
      web3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        lamports: zeroAccountRentExempt,
        newAccountPubkey: beneficiary.publicKey,
        programId: web3.SystemProgram.programId,
        space: 0,
      })
    ));
    const beneficiaryBalanceBefore = await provider.connection.getBalance(beneficiary.publicKey);

    const deed = web3.Keypair.generate();
    await program.methods
      .initialize(lawyer.publicKey, beneficiary.publicKey, new anchor.BN(1), new anchor.BN(web3.LAMPORTS_PER_SOL))
      .accounts({deed: deed.publicKey})
      .signers([deed])
      .rpc();
    const deedBalance = await provider.connection.getBalance(deed.publicKey);
    expect(deedBalance).to.be.equal(web3.LAMPORTS_PER_SOL);
    
    // Sleep for 2 sec
    await new Promise(resolve => setTimeout(resolve, 2000));

    await program.methods
      .withdraw()
      .accounts({
        deed: deed.publicKey,
        lawyer: lawyer.publicKey,
        beneficiary: beneficiary.publicKey,
      })
      .signers([lawyer])
      .rpc();

    const deedAccount = await program.account.deed.fetchNullable(deed.publicKey);
    expect(deedAccount).to.be.null;

    const beneficiaryBalanceAfter = await provider.connection.getBalance(beneficiary.publicKey);
    expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.be.equal(web3.LAMPORTS_PER_SOL);
  });

  it('Should NOT withdraw early', async() => {
    const deed = web3.Keypair.generate();
    await program.methods
      .initialize(lawyer.publicKey, beneficiary.publicKey, new anchor.BN(60), new anchor.BN(web3.LAMPORTS_PER_SOL))
      .accounts({deed: deed.publicKey})
      .signers([deed])
      .rpc();
    const deedBalance = await provider.connection.getBalance(deed.publicKey);
    expect(deedBalance).to.be.equal(web3.LAMPORTS_PER_SOL);

    await expect(program.methods
      .withdraw()
      .accounts({
        deed: deed.publicKey,
        lawyer: lawyer.publicKey,
        beneficiary: beneficiary.publicKey,
      })
      .signers([lawyer])
      .rpc()).to.be.rejectedWith(/Too early/);
  });

  it('Should NOT withdraw non laywer', async() => {
    const deed = web3.Keypair.generate();
    await program.methods
      .initialize(lawyer.publicKey, beneficiary.publicKey, new anchor.BN(1), new anchor.BN(web3.LAMPORTS_PER_SOL))
      .accounts({deed: deed.publicKey})
      .signers([deed])
      .rpc();
    const deedBalance = await provider.connection.getBalance(deed.publicKey);
    expect(deedBalance).to.be.equal(web3.LAMPORTS_PER_SOL);

    const fake = web3.Keypair.generate();
    await expect(program.methods
      .withdraw()
      .accounts({
        deed: deed.publicKey,
        lawyer: fake.publicKey,
        beneficiary: beneficiary.publicKey,
      })
      .signers([lawyer])
      .rpc()).to.be.rejected;
  });

  it('Should NOT init with amount less rent_exempt', async() => {
    const deed = web3.Keypair.generate();
    await expect(program.methods
      .initialize(lawyer.publicKey, beneficiary.publicKey, new anchor.BN(1), new anchor.BN(1))
      .accounts({deed: deed.publicKey})
      .signers([deed])
      .rpc()).to.be.rejectedWith(/Amount should be more than rent exempt/);
  });
});
